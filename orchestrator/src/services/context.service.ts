import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db';
import { Task, getTaskById, getTaskDependencies } from './task.service';
import { getEpicWithStats, EpicWithStats } from './epic.service';
import { getProjectById, getProjectStats, Project } from './project.service';
import { listRepositories, Repository } from './repository.service';

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

// ============================================================================
// Project Context
// ============================================================================

export interface ProjectContext {
  project: Project;
  stats: {
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    completionRate: number;
    epicsCount: number;
    repositoriesCount: number;
  };
  repositories: Repository[];
  epics: Array<{
    id: number;
    title: string;
    status: string;
    taskCount: number;
    progressPercentage: number;
  }>;
  recentTasks: Array<{
    id: number;
    title: string;
    status: string;
    epicId: number | null;
    epicTitle: string | null;
  }>;
}

/**
 * Get full context for a project including stats, repos, epics, and recent tasks
 */
export function getProjectContext(projectId: number): ProjectContext | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const db = getDatabase();

  // Get project stats
  const rawStats = getProjectStats(projectId);
  const totalTasks = Object.values(rawStats.tasks_by_status).reduce((a, b) => a + b, 0);
  const stats = {
    totalTasks,
    tasksByStatus: rawStats.tasks_by_status,
    completionRate: rawStats.completion_rate,
    epicsCount: rawStats.epics_count,
    repositoriesCount: rawStats.repositories_count,
  };

  // Get repositories
  const repositories = listRepositories(projectId);

  // Get epics with task counts and calculated progress
  const epics = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.status,
        COUNT(t.id) as task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
      FROM epics e
      LEFT JOIN tasks t ON t.epic_id = e.id
      WHERE e.project_id = ?
      GROUP BY e.id
      ORDER BY e.id ASC
    `
    )
    .all(projectId) as {
    id: number;
    title: string;
    status: string;
    task_count: number;
    done_count: number;
  }[];

  const formattedEpics = epics.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    taskCount: e.task_count,
    progressPercentage: e.task_count > 0 ? Math.round((e.done_count / e.task_count) * 100) : 0,
  }));

  // Get recent tasks (last 20)
  const recentTasks = db
    .prepare(
      `
      SELECT
        t.id,
        t.title,
        t.status,
        t.epic_id,
        e.title as epic_title
      FROM tasks t
      LEFT JOIN epics e ON e.id = t.epic_id
      WHERE t.project_id = ?
      ORDER BY t.updated_at DESC
      LIMIT 20
    `
    )
    .all(projectId) as {
    id: number;
    title: string;
    status: string;
    epic_id: number | null;
    epic_title: string | null;
  }[];

  const formattedTasks = recentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    epicId: t.epic_id,
    epicTitle: t.epic_title,
  }));

  return {
    project,
    stats,
    repositories,
    epics: formattedEpics,
    recentTasks: formattedTasks,
  };
}

/**
 * Generate markdown content for project context file
 */
export function generateProjectContextMarkdown(context: ProjectContext): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Project: ${context.project.name}`);
  lines.push('');
  lines.push(`**Local Path:** ${context.project.local_path}`);
  lines.push(`**Git Remote:** ${context.project.git_remote ?? 'Not configured'}`);
  lines.push(`**Workflow:** ${context.project.workflow_template ?? 'Default'}`);
  lines.push('');

  // Project Statistics
  lines.push('## Project Statistics');
  lines.push('');
  lines.push(`- **Total Tasks:** ${context.stats.totalTasks}`);
  lines.push(`- **Completion Rate:** ${context.stats.completionRate}%`);
  lines.push(`- **Epics:** ${context.stats.epicsCount}`);
  lines.push(`- **Repositories:** ${context.stats.repositoriesCount}`);
  lines.push('');

  // Tasks by Status
  if (Object.keys(context.stats.tasksByStatus).length > 0) {
    lines.push('### Tasks by Status');
    lines.push('');
    lines.push('| Status | Count |');
    lines.push('|--------|-------|');
    for (const [status, count] of Object.entries(context.stats.tasksByStatus)) {
      lines.push(`| ${status} | ${count} |`);
    }
    lines.push('');
  }

  // Repositories
  lines.push('## Repositories');
  lines.push('');
  if (context.repositories.length === 0) {
    lines.push('_No repositories configured._');
  } else {
    for (const repo of context.repositories) {
      lines.push(`### ${repo.name}`);
      lines.push(`- **Path:** ${repo.path}`);
      lines.push(`- **Git URL:** ${repo.git_url ?? 'Not configured'}`);
      lines.push(`- **Status:** ${repo.status}`);
      lines.push('');
    }
  }
  lines.push('');

  // Epics Overview
  lines.push('## Epics Overview');
  lines.push('');
  if (context.epics.length === 0) {
    lines.push('_No epics created yet._');
  } else {
    for (const epic of context.epics) {
      lines.push(`### Epic #${epic.id}: ${epic.title}`);
      lines.push(`- **Status:** ${epic.status}`);
      lines.push(`- **Tasks:** ${epic.taskCount}`);
      lines.push(`- **Progress:** ${epic.progressPercentage}%`);
      lines.push('');
    }
  }
  lines.push('');

  // Recent Tasks
  lines.push('## Recent Tasks (Last 20)');
  lines.push('');
  if (context.recentTasks.length === 0) {
    lines.push('_No tasks created yet._');
  } else {
    for (const task of context.recentTasks) {
      const epicInfo = task.epicTitle ? ` (Epic: ${task.epicTitle})` : '';
      lines.push(`- **#${task.id}:** ${task.title} [${task.status}]${epicInfo}`);
    }
  }
  lines.push('');

  // Coordination Instructions
  lines.push('## Coordination Instructions');
  lines.push('');
  lines.push('You are reviewing this project at a high level. You can:');
  lines.push('');
  lines.push('1. **Analyze Progress:** Review overall project health and identify blockers');
  lines.push('2. **Cross-Epic Work:** Coordinate work that spans multiple epics');
  lines.push('3. **Project Planning:** Help with roadmap and prioritization decisions');
  lines.push('4. **Architecture Review:** Analyze cross-cutting technical concerns');
  lines.push('');
  lines.push('This is a coordination context - for implementation work, use Task context.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Write project context file to a directory
 */
export function writeProjectContextFile(worktreePath: string, projectId: number): string | null {
  const context = getProjectContext(projectId);
  if (!context) return null;

  const content = generateProjectContextMarkdown(context);

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
