import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import { Task, getTaskById, getTaskDependencies } from './task.service';

export interface TaskContext {
  task: Task;
  dependencies: {
    id: number;
    title: string;
    status: string;
  }[];
  projectName: string;
  epicTitle?: string;
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

  // Get epic title if exists
  let epicTitle: string | undefined;
  if (task.epic_id) {
    const epic = db.prepare('SELECT title FROM epics WHERE id = ?').get(task.epic_id) as
      | { title: string }
      | undefined;
    epicTitle = epic?.title;
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
 */
export function writeContextFile(worktreePath: string, taskId: number): string | null {
  const context = getTaskContext(taskId);
  if (!context) return null;

  const contextDir = path.join(worktreePath, '.specflux');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  const contextPath = path.join(contextDir, 'context.md');
  const content = generateContextMarkdown(context);
  fs.writeFileSync(contextPath, content, 'utf-8');

  return contextPath;
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
