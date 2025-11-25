import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import { Task, getTaskById, getTaskDependencies } from './task.service';
import { getEpicWithStats, EpicWithStats } from './epic.service';

export interface TaskContext {
  task: Task;
  dependencies: {
    id: number;
    title: string;
    status: string;
  }[];
  projectName: string;
  epicTitle?: string;
  epicPrd?: string;
}

/**
 * Get full context for a task including dependencies
 */
export function getTaskContext(taskId: number): TaskContext | null {
  const task = getTaskById(taskId);
  if (!task) return null;

  const db = getDatabase();

  // Get project name
  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(task.project_id) as
    | { name: string }
    | undefined;

  // Get epic title and PRD if exists
  let epicTitle: string | undefined;
  let epicPrd: string | undefined;
  if (task.epic_id) {
    const epic = db
      .prepare('SELECT title, prd_content FROM epics WHERE id = ?')
      .get(task.epic_id) as { title: string; prd_content: string | null } | undefined;
    epicTitle = epic?.title;
    epicPrd = epic?.prd_content ?? undefined;
  }

  // Get dependencies
  const dependencies = getTaskDependencies(taskId).map((dep) => ({
    id: dep.depends_on_task_id,
    title: dep.depends_on_task?.title ?? 'Unknown',
    status: dep.depends_on_task?.status ?? 'unknown',
  }));

  return {
    task,
    dependencies,
    projectName: project?.name ?? 'Unknown Project',
    epicTitle,
    epicPrd,
  };
}

/**
 * Generate markdown content for task context file
 */
export function generateContextMarkdown(context: TaskContext): string {
  const lines: string[] = [];

  lines.push('# Task Context');
  lines.push('');
  lines.push(`**Project:** ${context.projectName}`);
  if (context.epicTitle) {
    lines.push(`**Epic:** ${context.epicTitle}`);
  }
  lines.push('');
  lines.push('## Task Details');
  lines.push('');
  lines.push(`**ID:** ${context.task.id}`);
  lines.push(`**Title:** ${context.task.title}`);
  lines.push(`**Status:** ${context.task.status}`);
  if (context.task.repo_name) {
    lines.push(`**Repository:** ${context.task.repo_name}`);
  }
  lines.push('');

  if (context.task.description) {
    lines.push('## Description');
    lines.push('');
    lines.push(context.task.description);
    lines.push('');
  }

  if (context.epicPrd) {
    lines.push('## Epic PRD (Product Requirements Document)');
    lines.push('');
    lines.push('This task is part of an epic. Here is the PRD for context:');
    lines.push('');
    lines.push(context.epicPrd);
    lines.push('');
  }

  if (context.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    lines.push('This task depends on the following tasks:');
    lines.push('');
    for (const dep of context.dependencies) {
      const statusIcon = dep.status === 'done' || dep.status === 'approved' ? '✅' : '⏳';
      lines.push(`- ${statusIcon} [#${dep.id}] ${dep.title} (${dep.status})`);
    }
    lines.push('');
  }

  lines.push('## Instructions');
  lines.push('');
  lines.push('Please complete this task according to the description above.');
  lines.push('When making changes:');
  lines.push('- Follow the existing code style and patterns');
  lines.push('- Write tests for new functionality');
  lines.push('- Update documentation if needed');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write context file to a directory
 * Writes to CLAUDE.md so Claude Code reads it automatically on startup
 */
export function writeContextFile(worktreePath: string, taskId: number): string | null {
  const context = getTaskContext(taskId);
  if (!context) return null;

  const content = generateContextMarkdown(context);

  // Write to CLAUDE.md for Claude Code to read automatically
  const claudeMdPath = path.join(worktreePath, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, content, 'utf-8');

  // Also write to .specflux/context.md for reference
  const contextDir = path.join(worktreePath, '.specflux');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  const contextPath = path.join(contextDir, 'context.md');
  fs.writeFileSync(contextPath, content, 'utf-8');

  return claudeMdPath;
}

/**
 * Read existing context file
 */
export function readContextFile(worktreePath: string): string | null {
  const contextPath = path.join(worktreePath, '.specflux', 'context.md');
  if (!fs.existsSync(contextPath)) return null;
  return fs.readFileSync(contextPath, 'utf-8');
}

/**
 * Delete context file
 */
export function deleteContextFile(worktreePath: string): void {
  const contextPath = path.join(worktreePath, '.specflux', 'context.md');
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
  }
}

// ============================================================================
// Epic Context
// ============================================================================

export interface EpicContext {
  epic: EpicWithStats;
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    dependencies: Array<{ id: number; title: string; status: string }>;
  }>;
  projectName: string;
  prdContent?: string;
}

/**
 * Get full context for an epic including all tasks
 */
export function getEpicContext(epicId: number): EpicContext | null {
  const epic = getEpicWithStats(epicId);
  if (!epic) return null;

  const db = getDatabase();

  // Get project name
  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(epic.project_id) as
    | { name: string }
    | undefined;

  // Get all tasks for this epic with their dependencies
  const tasksRaw = db
    .prepare(
      `
      SELECT id, title, description, status
      FROM tasks
      WHERE epic_id = ?
      ORDER BY id ASC
    `
    )
    .all(epicId) as { id: number; title: string; description: string | null; status: string }[];

  // Get dependencies for each task
  const tasks = tasksRaw.map((task) => {
    const dependencies = getTaskDependencies(task.id).map((dep) => ({
      id: dep.depends_on_task_id,
      title: dep.depends_on_task?.title ?? 'Unknown',
      status: dep.depends_on_task?.status ?? 'unknown',
    }));
    return { ...task, dependencies };
  });

  // Try to read PRD content if path exists
  let prdContent: string | undefined;
  if (epic.prd_file_path) {
    try {
      // Check if it's an absolute path or relative
      const prdPath = path.isAbsolute(epic.prd_file_path) ? epic.prd_file_path : epic.prd_file_path;

      if (fs.existsSync(prdPath)) {
        prdContent = fs.readFileSync(prdPath, 'utf-8');
      }
    } catch {
      // Couldn't read PRD file, leave as undefined
    }
  }

  return {
    epic,
    tasks,
    projectName: project?.name ?? 'Unknown Project',
    prdContent,
  };
}

/**
 * Generate markdown content for epic context file
 */
export function generateEpicContextMarkdown(context: EpicContext): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Epic: ${context.epic.title}`);
  lines.push('');
  lines.push(`**Project:** ${context.projectName}`);
  lines.push(`**Status:** ${context.epic.status}`);
  lines.push(
    `**Progress:** ${context.epic.progress_percentage}% (${context.epic.task_stats.done}/${context.epic.task_stats.total} tasks)`
  );
  lines.push('');

  // Epic description
  lines.push('## Epic Description');
  lines.push('');
  if (context.epic.description) {
    lines.push(context.epic.description);
  } else {
    lines.push('_No description provided._');
  }
  lines.push('');

  // PRD section
  lines.push('## Product Requirements Document (PRD)');
  lines.push('');
  if (context.prdContent) {
    lines.push(context.prdContent);
  } else if (context.epic.prd_file_path) {
    lines.push(`_PRD file specified at: ${context.epic.prd_file_path}_`);
    lines.push('_Could not read file contents._');
  } else {
    lines.push('_No PRD provided for this epic._');
  }
  lines.push('');

  // Tasks section
  lines.push('## Tasks in this Epic');
  lines.push('');

  if (context.tasks.length === 0) {
    lines.push('_No tasks have been created for this epic yet._');
  } else {
    for (const task of context.tasks) {
      lines.push(`### Task #${task.id}: ${task.title}`);
      lines.push(`**Status:** ${task.status}`);

      if (task.description) {
        lines.push(`**Description:** ${task.description}`);
      } else {
        lines.push('**Description:** _No description_');
      }

      if (task.dependencies.length > 0) {
        const depList = task.dependencies
          .map((d) => `#${d.id} ${d.title} (${d.status})`)
          .join(', ');
        lines.push(`**Dependencies:** ${depList}`);
      } else {
        lines.push('**Dependencies:** None');
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  // Review instructions
  lines.push('## Review Instructions');
  lines.push('');
  lines.push('You are reviewing this epic for planning quality. Please analyze:');
  lines.push('');
  lines.push(
    '1. **PRD Completeness:** Does the PRD clearly define the problem, goals, and success criteria?'
  );
  lines.push(
    '2. **Task Breakdown:** Are tasks appropriately sized? (ideally 1-4 hours of work each)'
  );
  lines.push(
    '3. **Task Context:** Does each task have enough description for an agent to understand what to do?'
  );
  lines.push('4. **Dependencies:** Are task dependencies correctly identified?');
  lines.push('5. **Missing Tasks:** Are there any obvious tasks missing from the breakdown?');
  lines.push('');
  lines.push("Provide specific, actionable feedback for improving this epic's planning.");
  lines.push('');

  return lines.join('\n');
}

/**
 * Write epic context file to a directory
 */
export function writeEpicContextFile(worktreePath: string, epicId: number): string | null {
  const context = getEpicContext(epicId);
  if (!context) return null;

  const content = generateEpicContextMarkdown(context);

  // Write to CLAUDE.md for Claude Code to read automatically
  const claudeMdPath = path.join(worktreePath, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, content, 'utf-8');

  // Also write to .specflux/context.md for reference
  const contextDir = path.join(worktreePath, '.specflux');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  const contextPath = path.join(contextDir, 'context.md');
  fs.writeFileSync(contextPath, content, 'utf-8');

  return claudeMdPath;
}
