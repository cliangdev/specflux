/**
 * Claude Session Store
 *
 * Manages the mapping between SpecFlux contexts (task/epic/prd) and Claude session IDs.
 * Stores data locally in .specflux/claude-sessions.json within the project directory.
 */

import { readTextFile, writeTextFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

const SPECFLUX_DIR = ".specflux";
const SESSIONS_FILE = "claude-sessions.json";

interface SessionStore {
  [contextKey: string]: string; // e.g., "task-task_123" → "uuid"
}

/**
 * Get the path to the sessions file for a given working directory.
 */
async function getSessionsFilePath(workingDirectory: string): Promise<string> {
  return join(workingDirectory, SPECFLUX_DIR, SESSIONS_FILE);
}

/**
 * Ensure the .specflux directory exists.
 */
async function ensureSpecfluxDir(workingDirectory: string): Promise<void> {
  const specfluxPath = await join(workingDirectory, SPECFLUX_DIR);
  if (!(await exists(specfluxPath))) {
    await mkdir(specfluxPath, { recursive: true });
  }
}

/**
 * Load the session store from disk.
 */
async function loadSessionStore(workingDirectory: string): Promise<SessionStore> {
  try {
    const filePath = await getSessionsFilePath(workingDirectory);
    if (await exists(filePath)) {
      const content = await readTextFile(filePath);
      return JSON.parse(content) as SessionStore;
    }
  } catch (error) {
    console.warn("Failed to load Claude session store:", error);
  }
  return {};
}

/**
 * Save the session store to disk.
 */
async function saveSessionStore(
  workingDirectory: string,
  store: SessionStore
): Promise<void> {
  try {
    await ensureSpecfluxDir(workingDirectory);
    const filePath = await getSessionsFilePath(workingDirectory);
    await writeTextFile(filePath, JSON.stringify(store, null, 2));
  } catch (error) {
    console.warn("Failed to save Claude session store:", error);
  }
}

/**
 * Get the Claude session ID for a given context key.
 *
 * @param workingDirectory - The project's working directory
 * @param contextKey - The context key (e.g., "task-task_123")
 * @returns The Claude session ID if found, null otherwise
 */
export async function getClaudeSessionId(
  workingDirectory: string,
  contextKey: string
): Promise<string | null> {
  const store = await loadSessionStore(workingDirectory);
  return store[contextKey] || null;
}

/**
 * Save a Claude session ID for a given context key.
 *
 * @param workingDirectory - The project's working directory
 * @param contextKey - The context key (e.g., "task-task_123")
 * @param sessionId - The Claude session ID
 */
export async function saveClaudeSessionId(
  workingDirectory: string,
  contextKey: string,
  sessionId: string
): Promise<void> {
  const store = await loadSessionStore(workingDirectory);
  store[contextKey] = sessionId;
  await saveSessionStore(workingDirectory, store);
}

/**
 * Remove a Claude session ID for a given context key.
 *
 * @param workingDirectory - The project's working directory
 * @param contextKey - The context key (e.g., "task-task_123")
 */
export async function removeClaudeSessionId(
  workingDirectory: string,
  contextKey: string
): Promise<void> {
  const store = await loadSessionStore(workingDirectory);
  delete store[contextKey];
  await saveSessionStore(workingDirectory, store);
}

/**
 * Build a context key from context type and ID.
 *
 * @param contextType - The context type (e.g., "task", "epic", "prd")
 * @param contextId - The context ID
 * @returns The context key (e.g., "task-task_123")
 */
export function buildContextKey(contextType: string, contextId: string): string {
  return `${contextType}-${contextId}`;
}
