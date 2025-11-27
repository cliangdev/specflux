import fs from 'fs';
import path from 'path';
import { SPECFLUX_DIRS, ensureTaskStateDirectories } from './filesystem.service';

/**
 * Size thresholds for state file management
 */
export const SIZE_THRESHOLDS = {
  WARNING_KB: 50,
  AUTO_ARCHIVE_KB: 75,
  MAX_RECENT_SESSIONS: 5,
  WARN_TOTAL_SESSIONS: 20,
};

export interface TaskStateMetadata {
  task_id: number;
  epic_id: number | null;
  total_sessions: number;
  started_at: string | null;
  last_session_at: string | null;
  completed_at?: string;
}

export interface SessionEntry {
  session_number: number;
  timestamp: string;
  did: string[];
  issues: string | null;
  next: string;
}

export interface ChainInput {
  task_id: number;
  title: string;
  content: string;
}

export interface ChainOutput {
  summary: string;
  files_created?: string[];
  api_contract?: string;
  configuration?: string;
  integration_notes?: string;
}

export interface TaskState {
  metadata: TaskStateMetadata;
  chain_inputs: ChainInput[];
  progress_log: SessionEntry[];
  chain_output: ChainOutput | null;
  archived_summary?: {
    session_range: string;
    duration: string;
    accomplishments: string;
    archive_path: string;
  };
}

/**
 * Get the path to a task's state file
 */
export function getTaskStatePath(projectPath: string, taskId: number): string {
  return path.join(projectPath, SPECFLUX_DIRS.TASK_STATES, `task-${taskId}-state.md`);
}

/**
 * Get the path to a task's archive file
 */
export function getTaskArchivePath(projectPath: string, taskId: number): string {
  return path.join(projectPath, SPECFLUX_DIRS.ARCHIVES, `task-${taskId}-archive.md`);
}

/**
 * Get file size in KB
 */
function getFileSizeKb(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch {
    return 0;
  }
}

/**
 * Parse metadata JSON from state file content
 */
function parseMetadata(content: string): TaskStateMetadata | null {
  const metadataMatch = content.match(/## 0\. Metadata\s*```json\s*([\s\S]*?)\s*```/);
  if (!metadataMatch?.[1]) return null;

  try {
    return JSON.parse(metadataMatch[1]) as TaskStateMetadata;
  } catch {
    return null;
  }
}

/**
 * Parse chain inputs section
 */
function parseChainInputs(content: string): ChainInput[] {
  const inputs: ChainInput[] = [];
  const chainInputsMatch = content.match(
    /## 1\. Chain Inputs\s*([\s\S]*?)(?=## 2\. Progress Log|$)/
  );
  if (!chainInputsMatch?.[1]) return inputs;

  const section = chainInputsMatch[1];
  const inputMatches = section.matchAll(
    /### From Task #(\d+): ([^\n]+)\s*>([\s\S]*?)(?=### From Task|$)/g
  );

  for (const match of inputMatches) {
    const taskIdStr = match[1];
    const titleStr = match[2];
    const contentStr = match[3];
    if (!taskIdStr || !titleStr || !contentStr) continue;

    inputs.push({
      task_id: parseInt(taskIdStr, 10),
      title: titleStr.trim(),
      content: contentStr
        .trim()
        .split('\n')
        .map((l) => l.replace(/^>\s*/, ''))
        .join('\n'),
    });
  }

  return inputs;
}

/**
 * Parse progress log section
 */
function parseProgressLog(content: string): SessionEntry[] {
  const sessions: SessionEntry[] = [];
  const progressMatch = content.match(/## 2\. Progress Log\s*([\s\S]*?)(?=## 3\. Chain Output|$)/);
  if (!progressMatch?.[1]) return sessions;

  const section = progressMatch[1];
  const sessionMatches = section.matchAll(
    /### Session (\d+) - ([^\n]+)\s*\*\*Did:\*\*\s*([\s\S]*?)\*\*Issues:\*\*\s*([\s\S]*?)\*\*Next:\*\*\s*([\s\S]*?)(?=### Session|### Archived|$)/g
  );

  for (const match of sessionMatches) {
    const sessionNumStr = match[1];
    const timestampStr = match[2];
    const didStr = match[3];
    const issuesStr = match[4];
    const nextStr = match[5];
    if (!sessionNumStr || !timestampStr || !didStr || !issuesStr || !nextStr) continue;

    const didLines = didStr
      .trim()
      .split('\n')
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    sessions.push({
      session_number: parseInt(sessionNumStr, 10),
      timestamp: timestampStr.trim(),
      did: didLines,
      issues: issuesStr.trim() === 'None' ? null : issuesStr.trim(),
      next: nextStr.trim(),
    });
  }

  return sessions;
}

/**
 * Parse chain output section
 */
function parseChainOutput(content: string): ChainOutput | null {
  const outputMatch = content.match(/## 3\. Chain Output\s*([\s\S]*?)$/);
  if (!outputMatch?.[1] || outputMatch[1].includes('(To be completed)')) return null;

  const section = outputMatch[1];
  const summaryMatch = section.match(/### Summary\s*([\s\S]*?)(?=### |$)/);

  if (!summaryMatch?.[1]) return null;

  const output: ChainOutput = {
    summary: summaryMatch[1].trim(),
  };

  const filesMatch = section.match(/### Files Created\s*([\s\S]*?)(?=### |$)/);
  if (filesMatch?.[1]) {
    output.files_created = filesMatch[1]
      .trim()
      .split('\n')
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  const apiMatch = section.match(/### API Contract\s*```[\w]*\s*([\s\S]*?)\s*```/);
  if (apiMatch?.[1]) {
    output.api_contract = apiMatch[1].trim();
  }

  const configMatch = section.match(/### Configuration[^\n]*\s*```[\w]*\s*([\s\S]*?)\s*```/);
  if (configMatch?.[1]) {
    output.configuration = configMatch[1].trim();
  }

  const notesMatch = section.match(/### Integration Notes\s*([\s\S]*?)(?=### |$)/);
  if (notesMatch?.[1]) {
    output.integration_notes = notesMatch[1].trim();
  }

  return output;
}

/**
 * Read and parse a task state file
 */
export function readTaskState(projectPath: string, taskId: number): TaskState | null {
  const statePath = getTaskStatePath(projectPath, taskId);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  const content = fs.readFileSync(statePath, 'utf-8');
  const metadata = parseMetadata(content);

  if (!metadata) {
    return null;
  }

  return {
    metadata,
    chain_inputs: parseChainInputs(content),
    progress_log: parseProgressLog(content),
    chain_output: parseChainOutput(content),
  };
}

/**
 * Generate initial state file content
 */
function generateInitialStateContent(taskId: number, title: string, epicId: number | null): string {
  const metadata: TaskStateMetadata = {
    task_id: taskId,
    epic_id: epicId,
    total_sessions: 0,
    started_at: null,
    last_session_at: null,
  };

  return `# Task #${taskId}: ${title}

## 0. Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## 2. Progress Log

(No sessions yet)

## 3. Chain Output

(To be completed)
`;
}

/**
 * Create initial task state file
 */
export function createTaskState(
  projectPath: string,
  taskId: number,
  title: string,
  epicId: number | null
): string {
  // Ensure directories exist
  ensureTaskStateDirectories(projectPath);

  const statePath = getTaskStatePath(projectPath, taskId);
  const content = generateInitialStateContent(taskId, title, epicId);

  fs.writeFileSync(statePath, content);
  return statePath;
}

/**
 * Append a session entry to the progress log
 */
export function appendSession(
  projectPath: string,
  taskId: number,
  session: Omit<SessionEntry, 'session_number' | 'timestamp'>
): TaskState {
  const statePath = getTaskStatePath(projectPath, taskId);

  const state = readTaskState(projectPath, taskId);
  if (!state) {
    throw new Error(`Task state not found for task ${taskId}`);
  }

  // Update metadata
  const now = new Date().toISOString();
  state.metadata.total_sessions += 1;
  state.metadata.last_session_at = now;
  state.metadata.started_at ??= now;

  // Create new session entry
  const newSession: SessionEntry = {
    session_number: state.metadata.total_sessions,
    timestamp: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().slice(0, 5),
    did: session.did,
    issues: session.issues,
    next: session.next,
  };

  state.progress_log.push(newSession);

  // Check if archiving is needed
  const sizeKb = getFileSizeKb(statePath);
  if (sizeKb > SIZE_THRESHOLDS.AUTO_ARCHIVE_KB) {
    archiveOldSessions(projectPath, taskId, state);
  }

  // Write updated state
  writeTaskState(projectPath, taskId, state);

  return state;
}

/**
 * Write task state back to file
 */
function writeTaskState(projectPath: string, taskId: number, state: TaskState): void {
  const statePath = getTaskStatePath(projectPath, taskId);

  // Read existing content to get title
  const existingContent = fs.readFileSync(statePath, 'utf-8');
  const titleMatch = existingContent.match(/^# Task #\d+: (.+)$/m);
  const title = titleMatch ? titleMatch[1] : `Task ${taskId}`;

  let content = `# Task #${taskId}: ${title}

## 0. Metadata
\`\`\`json
${JSON.stringify(state.metadata, null, 2)}
\`\`\`

`;

  // Chain inputs section (if present)
  if (state.chain_inputs.length > 0) {
    content += `## 1. Chain Inputs

${state.chain_inputs
  .map(
    (input) => `### From Task #${input.task_id}: ${input.title}
> ${input.content.split('\n').join('\n> ')}
`
  )
  .join('\n')}
`;
  }

  // Progress log section
  content += `## 2. Progress Log

`;

  if (state.archived_summary) {
    content += `### Archived Summary (${state.archived_summary.session_range})
**Duration:** ${state.archived_summary.duration}
**Accomplishments:** ${state.archived_summary.accomplishments}
[Full details: ${state.archived_summary.archive_path}]

`;
  }

  if (state.progress_log.length === 0) {
    content += `(No sessions yet)

`;
  } else {
    for (const session of state.progress_log) {
      content += `### Session ${session.session_number} - ${session.timestamp}
**Did:**
${session.did.map((d) => `- ${d}`).join('\n')}

**Issues:** ${session.issues ?? 'None'}

**Next:** ${session.next}

`;
    }
  }

  // Chain output section
  content += `## 3. Chain Output

`;

  if (state.chain_output) {
    content += `### Summary
${state.chain_output.summary}

`;
    if (state.chain_output.files_created?.length) {
      content += `### Files Created
${state.chain_output.files_created.map((f) => `- ${f}`).join('\n')}

`;
    }
    if (state.chain_output.api_contract) {
      content += `### API Contract
\`\`\`typescript
${state.chain_output.api_contract}
\`\`\`

`;
    }
    if (state.chain_output.configuration) {
      content += `### Configuration Required
\`\`\`env
${state.chain_output.configuration}
\`\`\`

`;
    }
    if (state.chain_output.integration_notes) {
      content += `### Integration Notes
${state.chain_output.integration_notes}
`;
    }
  } else {
    content += `(To be completed)
`;
  }

  fs.writeFileSync(statePath, content);
}

/**
 * Archive old sessions when file exceeds size threshold
 */
function archiveOldSessions(projectPath: string, taskId: number, state: TaskState): void {
  const archivePath = getTaskArchivePath(projectPath, taskId);

  // Keep only the last MAX_RECENT_SESSIONS sessions
  const sessionsToArchive = state.progress_log.slice(0, -SIZE_THRESHOLDS.MAX_RECENT_SESSIONS);
  const sessionsToKeep = state.progress_log.slice(-SIZE_THRESHOLDS.MAX_RECENT_SESSIONS);

  if (sessionsToArchive.length === 0) return;

  // Generate archive content
  let archiveContent = '';
  if (fs.existsSync(archivePath)) {
    archiveContent = fs.readFileSync(archivePath, 'utf-8');
  } else {
    archiveContent = `# Task #${taskId} Archive

## Full Session History

`;
  }

  // Append sessions to archive
  for (const session of sessionsToArchive) {
    archiveContent += `### Session ${session.session_number} - ${session.timestamp}
**Did:**
${session.did.map((d) => `- ${d}`).join('\n')}

**Issues:** ${session.issues ?? 'None'}

**Next:** ${session.next}

`;
  }

  fs.writeFileSync(archivePath, archiveContent);

  // Update state with archived summary
  const firstArchived = sessionsToArchive[0];
  const lastArchived = sessionsToArchive[sessionsToArchive.length - 1];

  state.archived_summary = {
    session_range: `Sessions ${firstArchived?.session_number ?? 1}-${lastArchived?.session_number ?? sessionsToArchive.length}`,
    duration: `${firstArchived?.timestamp ?? 'unknown'} - ${lastArchived?.timestamp ?? 'unknown'}`,
    accomplishments:
      sessionsToArchive
        .flatMap((s) => s.did)
        .slice(0, 3)
        .join(', ') + '...',
    archive_path: path.relative(projectPath, archivePath),
  };

  state.progress_log = sessionsToKeep;
}

/**
 * Inject chain inputs from dependency tasks
 */
export function injectChainInputs(
  projectPath: string,
  taskId: number,
  dependencies: Array<{ id: number; title: string }>
): TaskState {
  const state = readTaskState(projectPath, taskId);
  if (!state) {
    throw new Error(`Task state not found for task ${taskId}`);
  }

  const chainInputs: ChainInput[] = [];

  for (const dep of dependencies) {
    const depState = readTaskState(projectPath, dep.id);
    if (depState?.chain_output) {
      let content = depState.chain_output.summary;
      if (depState.chain_output.api_contract) {
        content += `\n\nAPI:\n${depState.chain_output.api_contract}`;
      }
      if (depState.chain_output.integration_notes) {
        content += `\n\n${depState.chain_output.integration_notes}`;
      }

      chainInputs.push({
        task_id: dep.id,
        title: dep.title,
        content,
      });
    }
  }

  state.chain_inputs = chainInputs;
  writeTaskState(projectPath, taskId, state);

  return state;
}

/**
 * Extract chain output from a completed task
 */
export function extractChainOutput(projectPath: string, taskId: number): ChainOutput | null {
  const state = readTaskState(projectPath, taskId);
  return state?.chain_output ?? null;
}

/**
 * Set chain output for a task (when marking complete)
 */
export function setChainOutput(
  projectPath: string,
  taskId: number,
  output: ChainOutput
): TaskState {
  const state = readTaskState(projectPath, taskId);
  if (!state) {
    throw new Error(`Task state not found for task ${taskId}`);
  }

  state.chain_output = output;
  state.metadata.completed_at = new Date().toISOString();

  writeTaskState(projectPath, taskId, state);

  return state;
}

/**
 * Check if state file exists for a task
 */
export function hasTaskState(projectPath: string, taskId: number): boolean {
  const statePath = getTaskStatePath(projectPath, taskId);
  return fs.existsSync(statePath);
}

/**
 * Delete task state file (cleanup)
 */
export function deleteTaskState(projectPath: string, taskId: number): boolean {
  const statePath = getTaskStatePath(projectPath, taskId);
  const archivePath = getTaskArchivePath(projectPath, taskId);

  let deleted = false;

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    deleted = true;
  }

  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
    deleted = true;
  }

  return deleted;
}

/**
 * Get size warnings for a task state file
 */
export function getStateWarnings(projectPath: string, taskId: number): string[] {
  const warnings: string[] = [];
  const statePath = getTaskStatePath(projectPath, taskId);

  if (!fs.existsSync(statePath)) {
    return warnings;
  }

  const sizeKb = getFileSizeKb(statePath);
  const state = readTaskState(projectPath, taskId);

  if (sizeKb > SIZE_THRESHOLDS.AUTO_ARCHIVE_KB) {
    warnings.push(
      `State file exceeds ${SIZE_THRESHOLDS.AUTO_ARCHIVE_KB}KB - archiving recommended`
    );
  } else if (sizeKb > SIZE_THRESHOLDS.WARNING_KB) {
    warnings.push(`State file is ${sizeKb.toFixed(1)}KB - approaching archive threshold`);
  }

  if (state && state.metadata.total_sessions > SIZE_THRESHOLDS.WARN_TOTAL_SESSIONS) {
    warnings.push(`Task has ${state.metadata.total_sessions} sessions - consider decomposing`);
  }

  return warnings;
}
