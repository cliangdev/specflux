import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';
import { getTaskById, updateTask } from './task.service';
import { getProjectById } from './project.service';
import {
  createWorktree,
  removeWorktree,
  getWorktree,
  generateBranchName,
  cleanupWorktree,
} from './worktree.service';
import { writeContextFile } from './context.service';
import { getWorktreeChanges, commitAndCreatePR, WorktreeChanges } from './git-workflow.service';

export interface AgentSession {
  id: number;
  taskId: number;
  pid: number | null;
  worktreePath: string | null;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'completed';
  startedAt: string;
  endedAt: string | null;
}

export interface AgentProcess {
  taskId: number;
  sessionId: number;
  pty: pty.IPty;
  emitter: EventEmitter;
}

export interface SpawnAgentConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

// In-memory tracking of running agent processes
const runningAgents = new Map<number, AgentProcess>();

/**
 * Create agent session record in database
 */
function createAgentSession(taskId: number, worktreePath: string | null): number {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO agent_sessions (task_id, worktree_path, status)
       VALUES (?, ?, 'starting')`
    )
    .run(taskId, worktreePath);
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

  return {
    id: row['id'] as number,
    taskId: row['task_id'] as number,
    pid: row['pid'] as number | null,
    worktreePath: row['worktree_path'] as string | null,
    status: row['status'] as AgentSession['status'],
    startedAt: row['started_at'] as string,
    endedAt: row['ended_at'] as string | null,
  };
}

/**
 * Get active session for a task
 */
export function getActiveSessionForTask(taskId: number): AgentSession | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT * FROM agent_sessions
       WHERE task_id = ? AND status IN ('starting', 'running')
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(taskId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row['id'] as number,
    taskId: row['task_id'] as number,
    pid: row['pid'] as number | null,
    worktreePath: row['worktree_path'] as string | null,
    status: row['status'] as AgentSession['status'],
    startedAt: row['started_at'] as string,
    endedAt: row['ended_at'] as string | null,
  };
}

/**
 * Check if agent is running for a task
 */
export function isAgentRunning(taskId: number): boolean {
  return runningAgents.has(taskId);
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
  const isRunning = runningAgents.has(taskId);
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
 * Spawn Claude Code agent for a task
 */
export function spawnAgent(taskId: number, config?: SpawnAgentConfig): AgentSession {
  // Validate task exists
  const task = getTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  // Check if agent already running
  if (runningAgents.has(taskId)) {
    throw new ValidationError(`Agent already running for task ${taskId}`);
  }

  // Get project for worktree path
  const project = getProjectById(task.project_id);
  if (!project) {
    throw new NotFoundError('Project', task.project_id);
  }

  // Validate project path exists and is a git repo before attempting worktree
  if (!fs.existsSync(project.local_path)) {
    throw new ValidationError(
      `Cannot start agent: Project path "${project.local_path}" does not exist. ` +
        `Please update the project's local_path to a valid directory.`
    );
  }
  const gitDir = path.join(project.local_path, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new ValidationError(
      `Cannot start agent: Project path "${project.local_path}" is not a git repository. ` +
        `The agent requires a git repository to create isolated worktrees for tasks.`
    );
  }

  // Generate branch name and create worktree
  const branchName = generateBranchName(taskId, task.title);
  let worktreePath: string | null = null;

  try {
    const worktree = createWorktree(taskId, project.local_path, branchName);
    worktreePath = worktree.path;
  } catch (error) {
    // Check if worktree already exists
    const existingWorktree = getWorktree(taskId);
    if (existingWorktree) {
      worktreePath = existingWorktree.path;
    } else {
      // Re-throw with more context
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Failed to create worktree for task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Write context file
  if (worktreePath) {
    writeContextFile(worktreePath, taskId);
  }

  // Create session record
  const sessionId = createAgentSession(taskId, worktreePath);

  // Determine command and args
  // Pass task description as initial prompt so Claude starts working immediately
  const command = config?.command ?? 'claude';
  let args = config?.args;
  if (!args) {
    // Build initial prompt from task details
    const initialPrompt = `Please work on this task:\n\nTask #${task.id}: ${task.title}\n\n${task.description ?? 'No description provided.'}\n\nStart by understanding what needs to be done, then implement the changes.`;
    args = [initialPrompt];
  }

  // Build environment
  const env: Record<string, string> = {
    ...process.env,
    ...config?.env,
    SPECFLUX_TASK_ID: String(taskId),
    SPECFLUX_SESSION_ID: String(sessionId),
  } as Record<string, string>;

  try {
    // Spawn PTY process
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
      cwd: worktreePath ?? project.local_path,
      env,
    });

    // Create event emitter for output streaming
    const emitter = new EventEmitter();

    // Update session with PID
    updateAgentSession(sessionId, { pid: ptyProcess.pid, status: 'running' });

    // Update task status
    updateTask(taskId, { status: 'in_progress' });

    // Store agent process
    const agentProcess: AgentProcess = {
      taskId,
      sessionId,
      pty: ptyProcess,
      emitter,
    };
    runningAgents.set(taskId, agentProcess);

    // Handle output
    ptyProcess.onData((data) => {
      emitter.emit('data', data);
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      runningAgents.delete(taskId);

      const sessionStatus: AgentSession['status'] = exitCode === 0 ? 'completed' : 'failed';
      updateAgentSession(sessionId, {
        status: sessionStatus,
        ended_at: new Date().toISOString(),
        exit_code: exitCode,
      });

      // Handle completion flow
      try {
        const completionResult = handleAgentCompletion(
          taskId,
          exitCode,
          worktreePath,
          project.local_path,
          task.requires_approval
        );
        emitter.emit('completion', completionResult);
      } catch (error) {
        emitter.emit('completion-error', error);
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

    // Clean up worktree on failure
    if (worktreePath) {
      try {
        removeWorktree(taskId, project.local_path);
      } catch {
        // Ignore cleanup errors
      }
    }

    throw error;
  }
}

/**
 * Stop running agent for a task
 */
export function stopAgent(taskId: number): void {
  const agentProcess = runningAgents.get(taskId);
  if (!agentProcess) {
    throw new NotFoundError('AgentProcess', taskId);
  }

  // Update session status
  updateAgentSession(agentProcess.sessionId, { status: 'stopping' });

  // Kill the PTY process
  agentProcess.pty.kill();

  // The onExit handler will clean up and update final status
}

/**
 * Send input to agent PTY
 */
export function sendAgentInput(taskId: number, data: string): void {
  const agentProcess = runningAgents.get(taskId);
  if (!agentProcess) {
    throw new NotFoundError('AgentProcess', taskId);
  }

  agentProcess.pty.write(data);
}

/**
 * Resize agent PTY
 */
export function resizeAgentPty(taskId: number, cols: number, rows: number): void {
  const agentProcess = runningAgents.get(taskId);
  if (!agentProcess) {
    throw new NotFoundError('AgentProcess', taskId);
  }

  agentProcess.pty.resize(cols, rows);
}

/**
 * Get event emitter for agent output
 */
export function getAgentEmitter(taskId: number): EventEmitter | null {
  const agentProcess = runningAgents.get(taskId);
  return agentProcess?.emitter ?? null;
}

/**
 * List all running agents
 */
export function listRunningAgents(): { taskId: number; sessionId: number; pid: number }[] {
  return Array.from(runningAgents.values()).map((agent) => ({
    taskId: agent.taskId,
    sessionId: agent.sessionId,
    pid: agent.pty.pid,
  }));
}

/**
 * Get session history for a task
 */
export function getTaskSessionHistory(taskId: number): AgentSession[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM agent_sessions
       WHERE task_id = ?
       ORDER BY started_at DESC`
    )
    .all(taskId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row['id'] as number,
    taskId: row['task_id'] as number,
    pid: row['pid'] as number | null,
    worktreePath: row['worktree_path'] as string | null,
    status: row['status'] as AgentSession['status'],
    startedAt: row['started_at'] as string,
    endedAt: row['ended_at'] as string | null,
  }));
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
function handleAgentCompletion(
  taskId: number,
  exitCode: number,
  worktreePath: string | null,
  projectPath: string,
  requiresApproval: boolean
): CompletionResult {
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
        const prResult = commitAndCreatePR(taskId);
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
 * Manually approve task and trigger commit/PR creation
 * Called when user approves a task in pending_review status
 */
export function approveAndCreatePR(taskId: number): CompletionResult {
  const task = getTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const project = getProjectById(task.project_id);
  if (!project) {
    throw new NotFoundError('Project', task.project_id);
  }

  const worktree = getWorktree(taskId);
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

  // Check for changes
  if (worktree) {
    const changes = getWorktreeChanges(worktree.path);
    result.hasChanges = changes.hasChanges;
    result.changes = changes;

    if (changes.hasChanges) {
      // Commit and create PR
      const prResult = commitAndCreatePR(taskId);
      result.commitHash = prResult.commit.commitHash;
      result.prCreated = prResult.pr.success;
      result.prUrl = prResult.pr.prUrl;
      result.prNumber = prResult.pr.prNumber;
    }

    // Clean up worktree
    const cleanup = cleanupWorktree(taskId, project.local_path);
    result.worktreeCleaned = cleanup.success;
  }

  // Update task to done
  updateTask(taskId, {
    status: 'done',
    github_pr_number: result.prNumber ?? undefined,
  });
  result.taskStatus = 'done';

  return result;
}
