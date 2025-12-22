/**
 * Claude Session Detector
 *
 * Detects Claude session IDs by monitoring the ~/.claude/projects/ directory.
 * Claude stores session data in .jsonl files named by session ID.
 */

import { readDir, stat } from "@tauri-apps/plugin-fs";
import { homeDir, join } from "@tauri-apps/api/path";
import { saveClaudeSessionId } from "./claudeSessionStore";

const CLAUDE_PROJECTS_DIR = ".claude/projects";
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 60000;

/**
 * Encode a project path the way Claude does it.
 * Claude replaces all "/" with "-" in the path.
 *
 * @param projectPath - The absolute project path (e.g., "/Users/foo/project")
 * @returns The encoded path (e.g., "-Users-foo-project")
 */
function encodeProjectPath(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

/**
 * Get the Claude projects directory path.
 */
async function getClaudeProjectsDir(): Promise<string> {
  const home = await homeDir();
  return join(home, CLAUDE_PROJECTS_DIR);
}

/**
 * Get the directory where Claude stores sessions for a specific project.
 */
async function getProjectSessionsDir(projectPath: string): Promise<string> {
  const claudeProjectsDir = await getClaudeProjectsDir();
  const encodedPath = encodeProjectPath(projectPath);
  return join(claudeProjectsDir, encodedPath);
}

interface SessionFile {
  name: string;
  sessionId: string;
  modifiedAt: Date;
}

/**
 * List all session files in the project's Claude directory.
 */
async function listSessionFiles(projectPath: string): Promise<SessionFile[]> {
  try {
    const sessionsDir = await getProjectSessionsDir(projectPath);
    const entries = await readDir(sessionsDir);
    const sessionFiles: SessionFile[] = [];

    for (const entry of entries) {
      if (entry.name && entry.name.endsWith(".jsonl") && entry.isFile) {
        const sessionId = entry.name.replace(".jsonl", "");
        const filePath = await join(sessionsDir, entry.name);
        try {
          const fileStat = await stat(filePath);
          if (fileStat.mtime) {
            sessionFiles.push({
              name: entry.name,
              sessionId,
              modifiedAt: new Date(fileStat.mtime),
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }
    }

    return sessionFiles;
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Find the most recently modified session file.
 */
async function findMostRecentSession(projectPath: string): Promise<SessionFile | null> {
  const files = await listSessionFiles(projectPath);
  if (files.length === 0) return null;

  return files.reduce((most, file) =>
    file.modifiedAt > most.modifiedAt ? file : most
  );
}

/**
 * Find a session file modified after a given timestamp.
 */
async function findSessionModifiedAfter(
  projectPath: string,
  afterTimestamp: Date
): Promise<SessionFile | null> {
  const files = await listSessionFiles(projectPath);

  // Find files modified after the timestamp
  const newFiles = files.filter((f) => f.modifiedAt > afterTimestamp);
  if (newFiles.length === 0) return null;

  // Return the most recent one
  return newFiles.reduce((most, file) =>
    file.modifiedAt > most.modifiedAt ? file : most
  );
}

/**
 * Detect the current Claude session ID for a project.
 * Returns the most recently modified session.
 *
 * @param projectPath - The absolute path to the project
 * @returns The session ID if found, null otherwise
 */
export async function detectClaudeSessionId(
  projectPath: string
): Promise<string | null> {
  const session = await findMostRecentSession(projectPath);
  return session?.sessionId || null;
}

/**
 * Take a snapshot of existing session IDs.
 * Call this BEFORE launching Claude to know which sessions already exist.
 */
export async function snapshotExistingSessions(
  workingDirectory: string
): Promise<Set<string>> {
  const files = await listSessionFiles(workingDirectory);
  return new Set(files.map((f) => f.sessionId));
}

/**
 * Poll for a new Claude session after launching Claude.
 * This runs in the background and saves the session ID when detected.
 *
 * @param workingDirectory - The project's working directory
 * @param contextKey - The context key for storing the session
 * @param existingSessionIds - Set of session IDs that existed before launching (from snapshotExistingSessions)
 * @param onSessionDetected - Optional callback when session is detected
 */
export async function pollForClaudeSession(
  workingDirectory: string,
  contextKey: string,
  existingSessionIds: Set<string>,
  onSessionDetected?: (sessionId: string) => void
): Promise<void> {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + POLL_TIMEOUT_MS);

  const poll = async (): Promise<void> => {
    if (new Date() > endTime) {
      console.log("Claude session detection timed out");
      return;
    }

    try {
      const currentFiles = await listSessionFiles(workingDirectory);
      // Find NEW session IDs that didn't exist before
      const newSessions = currentFiles.filter(
        (f) => !existingSessionIds.has(f.sessionId)
      );

      if (newSessions.length > 0) {
        // Pick the most recently modified new session
        const session = newSessions.reduce((most, file) =>
          file.modifiedAt > most.modifiedAt ? file : most
        );
        console.log(`Detected new Claude session: ${session.sessionId}`);
        await saveClaudeSessionId(workingDirectory, contextKey, session.sessionId);
        onSessionDetected?.(session.sessionId);
        return;
      }
    } catch (error) {
      console.warn("Error polling for Claude session:", error);
    }

    // Continue polling
    setTimeout(poll, POLL_INTERVAL_MS);
  };

  // Start polling (don't await - runs in background)
  setTimeout(poll, POLL_INTERVAL_MS);
}
