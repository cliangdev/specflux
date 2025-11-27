import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';
import { getTaskById, updateTask } from './task.service';
import { getProjectById, getProjectConfig } from './project.service';
import {
  createWorktree,
  removeWorktree,
  getWorktree,
  generateBranchName,
  cleanupWorktree,
} from './worktree.service';
import { writeContextFile, writeEpicContextFile, writeProjectContextFile } from './context.service';
import { getEpicById } from './epic.service';
import { getWorktreeChanges, commitAndCreatePR, WorktreeChanges } from './git-workflow.service';
import {
  parseTerminalOutput,
  createParserState,
  estimateProgress,
  type ParserState,
} from './terminal-parser.service';
import { recordFileChange } from './file-tracking.service';
import {
  generateTaskProtocol,
  generateEpicProtocol,
  generateProjectProtocol,
} from './session-protocol.service';
import { listCriteria } from './acceptance-criteria.service';
import { createTaskState, hasTaskState, injectChainInputs } from './task-state.service';
import { getTaskDependencies } from './task.service';

// Global emitter for agent lifecycle events (start/stop)
// WebSocket handlers subscribe to this to know when to re-subscribe to task emitters
export const agentLifecycleEmitter = new EventEmitter();

export type ContextType = 'task' | 'epic' | 'project';

export interface AgentSession {
  id: number;
  contextType: ContextType;
  contextId: number;
  /** @deprecated Use contextId instead. Alias for backwards compatibility. */
  taskId: number;
  pid: number | null;
  worktreePath: string | null;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'completed';
  startedAt: string;
  endedAt: string | null;
}

export interface AgentProcess {
  contextType: ContextType;
  contextId: number;
  /** @deprecated Use contextId. Alias for task context backwards compatibility. */
  taskId: number;
  sessionId: number;
  pty: pty.IPty;
  emitter: EventEmitter;
  parserState: ParserState;
  dedupeState: DedupeState;
}

export interface SpawnAgentConfig {
  contextType?: ContextType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

// Helper to create context key for Map
function contextKey(contextType: ContextType, contextId: number): string {
  return `${contextType}-${contextId}`;
}

// In-memory tracking of running agent processes (keyed by "type-id")
const runningAgents = new Map<string, AgentProcess>();

/**
 * Filter out mouse tracking ANSI escape sequences from PTY output
 * Claude Code enables mouse tracking but we only want keyboard navigation in the embedded terminal
 *
 * Mouse mode sequences:
 * - ESC[?1000h/l - Mouse click tracking
 * - ESC[?1001h/l - Mouse highlight mode
 * - ESC[?1002h/l - Button event tracking
 * - ESC[?1003h/l - Any-event tracking (mouse movement)
 * - ESC[?1004h/l - Focus reporting
 * - ESC[?1006h/l - SGR mouse mode
 * - ESC[?1015h/l - urxvt mouse mode
 */
function filterMouseSequences(data: string): string {
  // Regex to match mouse-related escape sequences
  // Format: ESC [ ? <number> h  or  ESC [ ? <number> l
  // Numbers: 1000, 1001, 1002, 1003, 1004, 1006, 1015
  // eslint-disable-next-line no-control-regex
  const mouseRegex = /\x1b\[\?100[0-4][hl]|\x1b\[\?1006[hl]|\x1b\[\?1015[hl]/g;
  return data.replace(mouseRegex, '');
}

/**
 * Output deduplication state - tracks content that has been displayed
 * to filter out duplicate prompt renders from Claude Code's TUI
 */
interface DedupeState {
  // Track recently seen prompt-like content to detect duplicates
  lastPromptHash: string | null;
  // Timestamp of last prompt to allow re-display after significant time
  lastPromptTime: number;
}

/**
 * Create a simple hash of text content for comparison
 */
function hashContent(text: string): string {
  // Simple hash: first 100 chars of visible text
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[[0-9;]*[A-Za-z]/g;
  const visible = text.replace(ansiRegex, '').slice(0, 100);
  return visible;
}

/**
 * Detect and filter duplicate prompt content from Claude Code's TUI redraws
 *
 * Claude Code's TUI sometimes outputs the same prompt twice during screen redraws.
 * This function detects when the task prompt appears multiple times in the same chunk
 * and removes all but the first occurrence to prevent visual duplication.
 */
function filterDuplicatePrompts(data: string, state: DedupeState): string {
  // The specific prompt pattern we're looking for
  const promptMarker = 'Please work on this task:';

  // Count occurrences of the prompt marker in this chunk
  const promptCount = (data.match(new RegExp(promptMarker, 'g')) ?? []).length;

  if (promptCount <= 1) {
    // Single or no prompt - normal output, pass through
    if (promptCount === 1) {
      state.lastPromptHash = hashContent(data);
      state.lastPromptTime = Date.now();
    }
    return data;
  }

  // Multiple prompts in one chunk - this is the duplicate render issue
  // Find the first occurrence and remove everything from the second occurrence onwards
  const firstPromptIndex = data.indexOf(promptMarker);
  const secondPromptIndex = data.indexOf(promptMarker, firstPromptIndex + promptMarker.length);

  if (secondPromptIndex > 0) {
    // Keep only up to the second prompt (which is a duplicate)
    // Find where to cut - look for the redraw sequence before the second prompt
    // The redraw typically starts with cursor up commands before the duplicate
    let cutPoint = secondPromptIndex;

    // Look backwards from second prompt to find start of redraw sequence
    // Pattern: multiple \x1b[1A (cursor up) and \x1b[2K (clear line) sequences
    const searchStart = Math.max(firstPromptIndex + 100, secondPromptIndex - 500);
    const betweenPrompts = data.slice(searchStart, secondPromptIndex);

    // Find where the clear/redraw sequence begins
    // eslint-disable-next-line no-control-regex
    const redrawPattern = /\x1b\[2K\x1b\[1A/;
    const match = betweenPrompts.match(redrawPattern);
    if (match?.index !== undefined) {
      cutPoint = searchStart + match.index;
    }

    return data.slice(0, cutPoint);
  }

  return data;
}

/**
 * Create deduplication state for a new agent session
 */
function createDedupeState(): DedupeState {
  return {
    lastPromptHash: null,
    lastPromptTime: 0,
  };
}

/**
 * Create agent session record in database
 */
function createAgentSession(
  contextType: ContextType,
  contextId: number,
  worktreePath: string | null
): number {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO agent_sessions (context_type, context_id, worktree_path, status)
       VALUES (?, ?, ?, 'starting')`
    )
    .run(contextType, contextId, worktreePath);
  return result.lastInsertRowid as number;
}

/**
 * Update agent session in database
 */
function updateAgentSession(
  sessionId: number,
  updates: Partial<{
    pid: number | null;
    status: AgentSession['status'];
    ended_at: string;
    exit_code: number | null;
    error_message: string | null;
  }>
): void {
  const db = getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.pid !== undefined) {
    fields.push('pid = ?');
    values.push(updates.pid);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.ended_at !== undefined) {
    fields.push('ended_at = ?');
    values.push(updates.ended_at);
  }
  if (updates.exit_code !== undefined) {
    fields.push('exit_code = ?');
    values.push(updates.exit_code);
  }
  if (updates.error_message !== undefined) {
    fields.push('error_message = ?');
    values.push(updates.error_message);
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE agent_sessions SET ${fields.join(', ')} WHERE id = ?`).run(
      ...values,
      sessionId
    );
  }
}

/**
 * Get agent session by ID
 */
export function getAgentSession(sessionId: number): AgentSession | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sessionId) as
    | Record<string, unknown>
    | undefined;

  if (!row) return null;

  const contextType = (row['context_type'] as ContextType) ?? 'task';
  const contextId = row['context_id'] as number;

  return {
    id: row['id'] as number,
    contextType,
    contextId,
    taskId: contextId, // Backwards compat alias
    pid: row['pid'] as number | null,
    worktreePath: row['worktree_path'] as string | null,
    status: row['status'] as AgentSession['status'],
    startedAt: row['started_at'] as string,
    endedAt: row['ended_at'] as string | null,
  };
}

/**
 * Get active session for a context (generic)
 */
export function getActiveSessionForContext(
  contextType: ContextType,
  contextId: number
): AgentSession | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT * FROM agent_sessions
       WHERE context_type = ? AND context_id = ? AND status IN ('starting', 'running')
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(contextType, contextId) as Record<string, unknown> | undefined;

  if (!row) return null;

  const ctxType = (row['context_type'] as ContextType) ?? 'task';
  const ctxId = row['context_id'] as number;

  return {
    id: row['id'] as number,
    contextType: ctxType,
    contextId: ctxId,
    taskId: ctxId, // Backwards compat alias
    pid: row['pid'] as number | null,
    worktreePath: row['worktree_path'] as string | null,
    status: row['status'] as AgentSession['status'],
    startedAt: row['started_at'] as string,
    endedAt: row['ended_at'] as string | null,
  };
}

/**
 * Get active session for a task (backwards compat)
 */
export function getActiveSessionForTask(taskId: number): AgentSession | null {
  return getActiveSessionForContext('task', taskId);
}

/**
 * Check if agent is running for a context
 */
export function isAgentRunningForContext(contextType: ContextType, contextId: number): boolean {
  return runningAgents.has(contextKey(contextType, contextId));
}

/**
 * Check if agent is running for a task (backwards compat)
 */
export function isAgentRunning(taskId: number): boolean {
  return isAgentRunningForContext('task', taskId);
}

/**
 * Agent status response matching OpenAPI spec
 */
export interface AgentStatusResponse {
  task_id: number;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  pid: number | null;
  started_at: string | null;
  stopped_at: string | null;
  error_message: string | null;
}

/**
 * Get agent status for a task - returns format matching OpenAPI spec
 */
export function getAgentStatus(taskId: number): AgentStatusResponse {
  const isRunning = isAgentRunning(taskId);
  const session = getActiveSessionForTask(taskId);

  // Map internal status to API status
  let status: AgentStatusResponse['status'] = 'idle';
  if (isRunning) {
    status = 'running';
  } else if (session) {
    // Map session status to API status
    switch (session.status) {
      case 'starting':
      case 'running':
        status = 'running';
        break;
      case 'stopping':
      case 'stopped':
        status = 'stopped';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'idle';
    }
  }

  return {
    task_id: taskId,
    status,
    pid: session?.pid ?? null,
    started_at: session?.startedAt ?? null,
    stopped_at: session?.endedAt ?? null,
    error_message: null, // Would need to add this to session tracking
  };
}

/**
 * Spawn Claude Code agent for a context (task or epic)
 */
export function spawnAgentForContext(
  contextType: ContextType,
  contextId: number,
  config?: SpawnAgentConfig
): AgentSession {
  const key = contextKey(contextType, contextId);

  // Check if agent already running
  if (runningAgents.has(key)) {
    throw new ValidationError(`Agent already running for ${contextType} ${contextId}`);
  }

  // Get task or epic and determine project
  let task: ReturnType<typeof getTaskById> | null = null;
  let epic: ReturnType<typeof getEpicById> | null = null;
  let projectId: number;

  if (contextType === 'task') {
    task = getTaskById(contextId);
    if (!task) {
      throw new NotFoundError('Task', contextId);
    }
    projectId = task.project_id;

    // Validate task has at least one acceptance criterion (Definition of Ready)
    const criteria = listCriteria('task', contextId);
    if (criteria.length === 0) {
      throw new ValidationError(
        `Cannot start agent: Task #${contextId} has no acceptance criteria defined. ` +
          `Please add at least one acceptance criterion to define what "done" means.`
      );
    }
  } else if (contextType === 'epic') {
    epic = getEpicById(contextId);
    if (!epic) {
      throw new NotFoundError('Epic', contextId);
    }
    projectId = epic.project_id;
  } else {
    // project context - contextId is the project ID
    const project = getProjectById(contextId);
    if (!project) {
      throw new NotFoundError('Project', contextId);
    }
    projectId = project.id;
  }

  // Get project
  const project = getProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Validate project path exists
  if (!fs.existsSync(project.local_path)) {
    throw new ValidationError(
      `Cannot start agent: Project path "${project.local_path}" does not exist. ` +
        `Please update the project's local_path to a valid directory.`
    );
  }

  let worktreePath: string | null = null;

  // For task context, create worktree for isolated work
  // For epic context, work directly in project path (review only, no code changes)
  if (contextType === 'task' && task) {
    const gitDir = path.join(project.local_path, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new ValidationError(
        `Cannot start agent: Project path "${project.local_path}" is not a git repository. ` +
          `The agent requires a git repository to create isolated worktrees for tasks.`
      );
    }

    // Generate branch name and create worktree
    const branchName = generateBranchName(contextId, task.title);

    // Get base branch from project config
    const projectConfig = getProjectConfig(project.id);
    const baseBranch = projectConfig?.default_pr_target_branch ?? 'main';

    try {
      const worktree = createWorktree(contextId, project.local_path, branchName, baseBranch);
      worktreePath = worktree.path;
    } catch (error) {
      // Check if worktree already exists
      const existingWorktree = getWorktree(contextId, project.local_path);
      if (existingWorktree) {
        worktreePath = existingWorktree.path;
      } else {
        // Re-throw with more context
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError(
          `Failed to create worktree for task ${contextId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Write appropriate context file
  const agentWorkDir = worktreePath ?? project.local_path;
  if (contextType === 'task') {
    writeContextFile(agentWorkDir, contextId);

    // Ensure task state file exists
    if (!hasTaskState(agentWorkDir, contextId) && task) {
      createTaskState(agentWorkDir, contextId, task.title, task.epic_id ?? null);
    }

    // Inject chain inputs from completed dependencies
    const deps = getTaskDependencies(contextId);
    const completedDeps = deps
      .filter((d) => d.depends_on_task?.status === 'done')
      .map((d) => ({
        id: d.depends_on_task_id,
        title: d.depends_on_task?.title ?? `Task ${d.depends_on_task_id}`,
      }));
    if (completedDeps.length > 0) {
      injectChainInputs(agentWorkDir, contextId, completedDeps);
    }
  } else if (contextType === 'epic') {
    writeEpicContextFile(agentWorkDir, contextId);
  } else if (contextType === 'project') {
    writeProjectContextFile(agentWorkDir, contextId);
  }

  // Create session record
  const sessionId = createAgentSession(contextType, contextId, worktreePath);

  // Determine command and args
  const command = config?.command ?? 'claude';
  let args = config?.args;
  if (!args) {
    // Build initial prompt based on context type using session protocol service
    let initialPrompt: string;
    if (contextType === 'task' && task) {
      // Use the comprehensive session protocol for tasks
      const protocol = generateTaskProtocol(contextId, agentWorkDir);
      initialPrompt = protocol.initialPrompt;
    } else if (contextType === 'epic' && epic) {
      initialPrompt = generateEpicProtocol(contextId, epic.title);
    } else if (contextType === 'project') {
      initialPrompt = generateProjectProtocol(contextId);
    } else {
      initialPrompt = `Please start working. Read CLAUDE.md for context.`;
    }
    args = [initialPrompt];
  }

  // Build environment
  const env: Record<string, string> = {
    ...process.env,
    ...config?.env,
    SPECFLUX_CONTEXT_TYPE: contextType,
    SPECFLUX_CONTEXT_ID: String(contextId),
    // Backwards compat for task context
    ...(contextType === 'task' ? { SPECFLUX_TASK_ID: String(contextId) } : {}),
    SPECFLUX_SESSION_ID: String(sessionId),
  } as Record<string, string>;

  try {
    // Use provided dimensions or defaults
    // Defaults are reasonable for most terminal sizes
    const ptyCols = config?.cols ?? 120;
    const ptyRows = config?.rows ?? 40;
    if (process.env['DEBUG_TERMINAL'] === '1') {
      console.log(
        `[PTY DEBUG] Spawning PTY for ${contextType} ${contextId} with cols=${ptyCols}, rows=${ptyRows}`
      );
    }

    // Spawn PTY process with flow control enabled
    // Flow control helps prevent buffer back pressure when Claude Code produces large outputs
    // See: terminal-integration-research.md for details
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: ptyCols,
      rows: ptyRows,
      cwd: agentWorkDir,
      env,
      // Enable flow control for backpressure management (from research)
      // This pauses PTY output when buffer is full (XOFF) and resumes when cleared (XON)
      handleFlowControl: true,
    });

    // Create event emitter for output streaming
    const emitter = new EventEmitter();

    // Update session with PID
    updateAgentSession(sessionId, { pid: ptyProcess.pid, status: 'running' });

    // Update task status (only for task context)
    if (contextType === 'task' && task) {
      updateTask(contextId, { status: 'in_progress' });
    }

    // Create parser state for this agent
    const parserState = createParserState();

    // Create deduplication state for filtering duplicate prompts
    const dedupeState = createDedupeState();

    // Store agent process FIRST so getAgentEmitter() works when WebSocket reconnects
    const agentProcess: AgentProcess = {
      contextType,
      contextId,
      taskId: contextId, // Backwards compat alias
      sessionId,
      pty: ptyProcess,
      emitter,
      parserState,
      dedupeState,
    };
    runningAgents.set(key, agentProcess);

    // Notify WebSocket handlers that agent started (they can now subscribe to emitter)
    // Include both new and old formats for backwards compatibility
    agentLifecycleEmitter.emit('agent-started', {
      contextType,
      contextId,
      taskId: contextType === 'task' ? contextId : undefined,
      emitter,
    });

    // Track last progress update to avoid database spam
    let lastProgressUpdate = 0;
    const PROGRESS_UPDATE_THRESHOLD = 5; // Only update DB if progress changes by 5%

    // Track whether we've sent the initial clear screen
    let sentInitialClear = false;

    // Chunked output processing for large outputs (from research)
    // This prevents UI freezing by processing data in smaller chunks
    const OUTPUT_CHUNK_SIZE = 4096; // 4KB chunks
    let outputBuffer = '';
    let chunkFlushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushOutputBuffer = () => {
      if (outputBuffer.length === 0) return;

      // Process buffer in chunks
      while (outputBuffer.length > 0) {
        const chunk = outputBuffer.slice(0, OUTPUT_CHUNK_SIZE);
        outputBuffer = outputBuffer.slice(OUTPUT_CHUNK_SIZE);
        emitter.emit('data', chunk);
      }

      if (chunkFlushTimer) {
        clearTimeout(chunkFlushTimer);
        chunkFlushTimer = null;
      }
    };

    // Register output handler AFTER storing agent and notifying WebSocket
    // This ensures WebSocket is subscribed before any data is emitted
    ptyProcess.onData((data) => {
      // Filter out mouse tracking sequences - we only want keyboard navigation
      let filteredData = filterMouseSequences(data);

      // Filter duplicate prompts from Claude Code's TUI redraws
      filteredData = filterDuplicatePrompts(filteredData, dedupeState);

      // Send clear screen sequence before the very first output
      // This ensures terminal starts fresh for Claude Code's TUI
      if (!sentInitialClear) {
        sentInitialClear = true;
        emitter.emit('data', '\x1b[2J\x1b[H');
      }

      // Add filtered data to buffer
      outputBuffer += filteredData;

      // If buffer is large, flush in chunks immediately
      if (outputBuffer.length >= OUTPUT_CHUNK_SIZE) {
        flushOutputBuffer();
      } else {
        // For smaller outputs, use a short timer to batch them
        // This reduces the number of WebSocket messages for rapid small writes
        chunkFlushTimer ??= setTimeout(flushOutputBuffer, 10);
      }

      // Parse terminal output for progress events
      const events = parseTerminalOutput(data, parserState);

      // Emit parsed events
      for (const event of events) {
        emitter.emit('parsed', event);

        // Update task progress in database (throttled) - only for task context
        if (event.type === 'progress' && contextType === 'task') {
          const progress = event.progress;
          if (Math.abs(progress - lastProgressUpdate) >= PROGRESS_UPDATE_THRESHOLD) {
            lastProgressUpdate = progress;
            updateTask(contextId, { progress_percentage: progress });
            emitter.emit('progress', { contextType, contextId, taskId: contextId, progress });
          }
        }

        // Emit file events for tracking and record in database (task context only)
        if (event.type === 'file') {
          // Record file change in database (only for task context)
          if (contextType === 'task') {
            try {
              recordFileChange({
                taskId: contextId,
                sessionId,
                filePath: event.filePath,
                changeType: event.action,
              });
            } catch {
              // Ignore database errors - don't break terminal streaming
            }
          }

          emitter.emit('file-change', {
            contextType,
            contextId,
            taskId: contextType === 'task' ? contextId : undefined,
            sessionId,
            action: event.action,
            filePath: event.filePath,
          });
        }

        // Emit test events
        if (event.type === 'test') {
          emitter.emit('test-result', {
            contextType,
            contextId,
            taskId: contextType === 'task' ? contextId : undefined,
            passed: event.passed,
            failed: event.failed,
            total: event.total,
          });
        }
      }

      // Periodically update estimated progress if no explicit progress (task context only)
      if (contextType === 'task') {
        const estimatedProgress = estimateProgress(parserState);
        if (
          parserState.lastProgress === 0 &&
          estimatedProgress > lastProgressUpdate + PROGRESS_UPDATE_THRESHOLD
        ) {
          lastProgressUpdate = estimatedProgress;
          updateTask(contextId, { progress_percentage: estimatedProgress });
          emitter.emit('progress', {
            contextType,
            contextId,
            taskId: contextId,
            progress: estimatedProgress,
          });
        }
      }
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      // Flush any remaining buffered output before processing exit
      flushOutputBuffer();
      if (chunkFlushTimer) {
        clearTimeout(chunkFlushTimer);
        chunkFlushTimer = null;
      }

      runningAgents.delete(key);

      const sessionStatus: AgentSession['status'] = exitCode === 0 ? 'completed' : 'failed';
      updateAgentSession(sessionId, {
        status: sessionStatus,
        ended_at: new Date().toISOString(),
        exit_code: exitCode,
      });

      // Handle completion flow (task context only - epic has no completion workflow)
      if (contextType === 'task' && task) {
        try {
          const completionResult = handleAgentCompletion(
            contextId,
            exitCode,
            worktreePath,
            project.local_path,
            task.requires_approval
          );
          emitter.emit('completion', completionResult);
        } catch (error) {
          emitter.emit('completion-error', error);
        }
      }

      emitter.emit('exit', exitCode);
    });

    return getAgentSession(sessionId)!;
  } catch (error) {
    // Update session to failed
    updateAgentSession(sessionId, {
      status: 'failed',
      ended_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    // Clean up worktree on failure (task context only)
    if (worktreePath && contextType === 'task') {
      try {
        removeWorktree(contextId, project.local_path);
      } catch {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Spawn Claude Code agent for a task (backwards compatible wrapper)
 */
export function spawnAgent(taskId: number, config?: SpawnAgentConfig): AgentSession {
  return spawnAgentForContext('task', taskId, config);
}

/**
 * Stop running agent for a context
 * Idempotent - if no agent is running, silently returns
 */
export function stopAgentForContext(contextType: ContextType, contextId: number): void {
  const key = contextKey(contextType, contextId);
  const agentProcess = runningAgents.get(key);
  if (!agentProcess) {
    // No agent running - that's fine, nothing to stop
    return;
  }

  // Update session status
  updateAgentSession(agentProcess.sessionId, { status: 'stopping' });

  // Kill the PTY process
  agentProcess.pty.kill();

  // The onExit handler will clean up and update final status
}

/**
 * Stop running agent for a task (backwards compat)
 */
export function stopAgent(taskId: number): void {
  stopAgentForContext('task', taskId);
}

/**
 * Send input to agent PTY
 */
export function sendAgentInputForContext(
  contextType: ContextType,
  contextId: number,
  data: string
): void {
  const key = contextKey(contextType, contextId);
  const agentProcess = runningAgents.get(key);
  if (!agentProcess) {
    throw new NotFoundError('AgentProcess', `${contextType}-${contextId}`);
  }

  agentProcess.pty.write(data);
}

/**
 * Send input to agent PTY (backwards compat for task)
 */
export function sendAgentInput(taskId: number, data: string): void {
  sendAgentInputForContext('task', taskId, data);
}

/**
 * Resize agent PTY
 */
export function resizeAgentPtyForContext(
  contextType: ContextType,
  contextId: number,
  cols: number,
  rows: number
): void {
  const key = contextKey(contextType, contextId);
  const agentProcess = runningAgents.get(key);
  if (!agentProcess) {
    throw new NotFoundError('AgentProcess', `${contextType}-${contextId}`);
  }

  agentProcess.pty.resize(cols, rows);
}

/**
 * Resize agent PTY (backwards compat for task)
 */
export function resizeAgentPty(taskId: number, cols: number, rows: number): void {
  resizeAgentPtyForContext('task', taskId, cols, rows);
}

/**
 * Get event emitter for agent output
 */
export function getAgentEmitterForContext(
  contextType: ContextType,
  contextId: number
): EventEmitter | null {
  const key = contextKey(contextType, contextId);
  const agentProcess = runningAgents.get(key);
  return agentProcess?.emitter ?? null;
}

/**
 * Get event emitter for agent output (backwards compat for task)
 */
export function getAgentEmitter(taskId: number): EventEmitter | null {
  return getAgentEmitterForContext('task', taskId);
}

/**
 * List all running agents
 */
export function listRunningAgents(): {
  contextType: ContextType;
  contextId: number;
  taskId: number;
  sessionId: number;
  pid: number;
}[] {
  return Array.from(runningAgents.values()).map((agent) => ({
    contextType: agent.contextType,
    contextId: agent.contextId,
    taskId: agent.taskId, // Backwards compat
    sessionId: agent.sessionId,
    pid: agent.pty.pid,
  }));
}

/**
 * Get session history for a context
 */
export function getContextSessionHistory(
  contextType: ContextType,
  contextId: number
): AgentSession[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM agent_sessions
       WHERE context_type = ? AND context_id = ?
       ORDER BY started_at DESC`
    )
    .all(contextType, contextId) as Record<string, unknown>[];

  return rows.map((row) => {
    const ctxType = (row['context_type'] as ContextType) ?? 'task';
    const ctxId = row['context_id'] as number;
    return {
      id: row['id'] as number,
      contextType: ctxType,
      contextId: ctxId,
      taskId: ctxId, // Backwards compat
      pid: row['pid'] as number | null,
      worktreePath: row['worktree_path'] as string | null,
      status: row['status'] as AgentSession['status'],
      startedAt: row['started_at'] as string,
      endedAt: row['ended_at'] as string | null,
    };
  });
}

/**
 * Get session history for a task (backwards compat)
 */
export function getTaskSessionHistory(taskId: number): AgentSession[] {
  return getContextSessionHistory('task', taskId);
}

/**
 * Clean up stale sessions (for recovery after crashes)
 */
export function cleanupStaleSessions(): void {
  const db = getDatabase();
  db.prepare(
    `UPDATE agent_sessions
     SET status = 'failed',
         ended_at = CURRENT_TIMESTAMP,
         error_message = 'Server restart - session interrupted'
     WHERE status IN ('starting', 'running', 'stopping')`
  ).run();
}

/**
 * Completion flow result
 */
export interface CompletionResult {
  taskId: number;
  exitCode: number;
  hasChanges: boolean;
  changes: WorktreeChanges | null;
  requiresApproval: boolean;
  taskStatus: string;
  prCreated: boolean;
  prUrl: string | null;
  prNumber: number | null;
  commitHash: string | null;
  worktreeCleaned: boolean;
}

/**
 * Handle agent completion - determines task status based on changes and approval settings
 */
async function handleAgentCompletion(
  taskId: number,
  exitCode: number,
  worktreePath: string | null,
  projectPath: string,
  requiresApproval: boolean
): Promise<CompletionResult> {
  const result: CompletionResult = {
    taskId,
    exitCode,
    hasChanges: false,
    changes: null,
    requiresApproval,
    taskStatus: 'ready',
    prCreated: false,
    prUrl: null,
    prNumber: null,
    commitHash: null,
    worktreeCleaned: false,
  };

  // If agent failed, set task back to ready
  if (exitCode !== 0) {
    updateTask(taskId, { status: 'ready' });
    result.taskStatus = 'ready';
    return result;
  }

  // Check for changes in worktree
  if (worktreePath) {
    try {
      const changes = getWorktreeChanges(worktreePath);
      result.hasChanges = changes.hasChanges;
      result.changes = changes;
    } catch {
      // If we can't check changes, assume no changes
      result.hasChanges = false;
    }
  }

  // Determine flow based on changes and approval setting
  if (result.hasChanges) {
    if (requiresApproval) {
      // Has changes + needs approval -> pending_review
      // User will review and trigger commit/PR manually
      updateTask(taskId, { status: 'pending_review' });
      result.taskStatus = 'pending_review';
    } else {
      // Has changes + no approval -> auto commit and create PR
      try {
        const prResult = await commitAndCreatePR(taskId);
        result.commitHash = prResult.commit.commitHash;
        result.prCreated = prResult.pr.success;
        result.prUrl = prResult.pr.prUrl;
        result.prNumber = prResult.pr.prNumber;

        // Clean up worktree after PR created
        const cleanup = cleanupWorktree(taskId, projectPath);
        result.worktreeCleaned = cleanup.success;

        updateTask(taskId, {
          status: 'done',
          github_pr_number: result.prNumber ?? undefined,
          github_pr_url: result.prUrl ?? undefined,
        });
        result.taskStatus = 'done';
      } catch {
        // If PR creation fails, move to pending_review for manual handling
        updateTask(taskId, { status: 'pending_review' });
        result.taskStatus = 'pending_review';
      }
    }
  } else {
    // No changes
    if (requiresApproval) {
      // No changes + needs approval -> pending_review (user confirms completion)
      updateTask(taskId, { status: 'pending_review' });
      result.taskStatus = 'pending_review';
    } else {
      // No changes + no approval -> done
      // Clean up worktree
      const cleanup = cleanupWorktree(taskId, projectPath);
      result.worktreeCleaned = cleanup.success;

      updateTask(taskId, { status: 'done' });
      result.taskStatus = 'done';
    }
  }

  return result;
}

/**
 * Create PR for a task (without approving/completing it)
 * Called when user wants to create a PR for code review
 */
export async function createTaskPR(taskId: number): Promise<CompletionResult> {
  const task = getTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const project = getProjectById(task.project_id);
  if (!project?.local_path) {
    throw new NotFoundError('Project', task.project_id);
  }

  const worktree = getWorktree(taskId, project.local_path);

  const result: CompletionResult = {
    taskId,
    exitCode: 0,
    hasChanges: false,
    changes: null,
    requiresApproval: task.requires_approval,
    taskStatus: task.status,
    prCreated: false,
    prUrl: null,
    prNumber: null,
    commitHash: null,
    worktreeCleaned: false,
  };

  if (!worktree) {
    throw new ValidationError('No worktree found for task - nothing to commit');
  }

  // Check for changes
  const changes = getWorktreeChanges(worktree.path);
  result.hasChanges = changes.hasChanges;
  result.changes = changes;

  if (!changes.hasChanges) {
    throw new ValidationError('No changes to commit');
  }

  // Commit and create PR
  const prResult = await commitAndCreatePR(taskId);
  result.commitHash = prResult.commit.commitHash;
  result.prCreated = prResult.pr.success;
  result.prUrl = prResult.pr.prUrl;
  result.prNumber = prResult.pr.prNumber;

  // Update task with PR info (but keep status as pending_review)
  if (result.prNumber || result.prUrl) {
    updateTask(taskId, {
      github_pr_number: result.prNumber ?? undefined,
      github_pr_url: result.prUrl ?? undefined,
    });
  }

  return result;
}

/**
 * Approve a task and mark it as done
 * Optionally cleans up the worktree
 */
export function approveTask(taskId: number): { task: ReturnType<typeof getTaskById> } {
  const task = getTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const project = getProjectById(task.project_id);
  if (!project?.local_path) {
    throw new NotFoundError('Project', task.project_id);
  }

  // Clean up worktree if exists
  const worktree = getWorktree(taskId, project.local_path);
  if (worktree) {
    cleanupWorktree(taskId, project.local_path);
  }

  // Update task to done
  const updatedTask = updateTask(taskId, { status: 'done' });

  return { task: updatedTask };
}
