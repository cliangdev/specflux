import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  getClaudeMdTemplate,
  getMcpJsonTemplate,
  getPrdCommandTemplate,
  getEpicCommandTemplate,
  getDesignCommandTemplate,
  getImplementCommandTemplate,
  getTaskCommandTemplate,
} from './template.service';

/**
 * SpecFlux directory structure within a project
 */
export const SPECFLUX_DIRS = {
  ROOT: '.specflux',
  PRDS: '.specflux/prds',
  EPICS: '.specflux/epics',
  TASKS: '.specflux/tasks',
  CHAIN_OUTPUTS: '.specflux/chain-outputs',
  WORKTREES: '.specflux/worktrees',
  // Task state files for runtime state management
  TASK_STATES: '.specflux/task-states',
  // Archived task histories (when state files exceed size limits)
  ARCHIVES: '.specflux/archives',
} as const;

/**
 * Claude Code directory structure within a project
 */
export const CLAUDE_DIRS = {
  ROOT: '.claude',
  COMMANDS: '.claude/commands',
} as const;

export interface MarkdownFile<T extends Record<string, unknown> = Record<string, unknown>> {
  frontmatter: T;
  content: string;
  path: string;
}

export interface PrdFrontmatter extends Record<string, unknown> {
  title: string;
  status: 'draft' | 'review' | 'approved';
  created_at: string;
  updated_at: string;
  author?: string;
  epic_id?: number;
}

export interface EpicFrontmatter extends Record<string, unknown> {
  title: string;
  status: 'planning' | 'active' | 'completed';
  prd_path?: string;
  created_at: string;
  updated_at: string;
  author?: string;
}

export interface TaskContextFrontmatter extends Record<string, unknown> {
  task_id: number;
  title: string;
  epic_id?: number;
  dependencies: number[];
  chain_inputs: string[];
  created_at: string;
}

/**
 * Initialize the .specflux directory structure in a project
 */
export function initializeSpecfluxStructure(projectPath: string): void {
  const dirs = Object.values(SPECFLUX_DIRS);

  for (const dir of dirs) {
    const fullPath = path.join(projectPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  // Create .gitkeep files to preserve empty directories
  for (const dir of dirs.slice(1)) {
    // Skip ROOT
    const gitkeepPath = path.join(projectPath, dir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }
}

/**
 * Initialize .specflux structure for a project with error handling.
 * Returns success/error result instead of throwing.
 * Use this during project creation - it's best-effort and won't fail project creation.
 */
export function initializeProjectStructure(projectPath: string): {
  success: boolean;
  error?: string;
} {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: `Project path does not exist: ${projectPath}` };
    }
    initializeSpecfluxStructure(projectPath);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown filesystem error';
    console.error(`[filesystem] Failed to initialize project structure: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Initialize the .claude directory structure with template commands.
 * Creates CLAUDE.md, .mcp.json, and command templates (prd.md, epic.md, etc.)
 * Returns success/error result instead of throwing.
 */
export function initializeClaudeDirectory(
  projectPath: string,
  projectName: string
): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: `Project path does not exist: ${projectPath}` };
    }

    // Create .claude directories
    for (const dir of Object.values(CLAUDE_DIRS)) {
      const fullPath = path.join(projectPath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }

    // Write CLAUDE.md at project root (don't overwrite existing)
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    if (!fs.existsSync(claudeMdPath)) {
      fs.writeFileSync(claudeMdPath, getClaudeMdTemplate(projectName));
    }

    // Write .mcp.json (don't overwrite existing)
    const mcpPath = path.join(projectPath, CLAUDE_DIRS.ROOT, '.mcp.json');
    if (!fs.existsSync(mcpPath)) {
      fs.writeFileSync(mcpPath, getMcpJsonTemplate());
    }

    // Write command templates (don't overwrite existing)
    const commands = [
      { name: 'prd.md', content: getPrdCommandTemplate() },
      { name: 'epic.md', content: getEpicCommandTemplate() },
      { name: 'design.md', content: getDesignCommandTemplate() },
      { name: 'implement.md', content: getImplementCommandTemplate() },
      { name: 'task.md', content: getTaskCommandTemplate() },
    ];

    for (const cmd of commands) {
      const cmdPath = path.join(projectPath, CLAUDE_DIRS.COMMANDS, cmd.name);
      if (!fs.existsSync(cmdPath)) {
        fs.writeFileSync(cmdPath, cmd.content);
      }
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[filesystem] Failed to initialize .claude directory: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Ensure task state directories exist (task-states and archives)
 * Use this when starting a task to ensure directories exist without full initialization
 */
export function ensureTaskStateDirectories(projectPath: string): void {
  const taskStateDirs = [SPECFLUX_DIRS.TASK_STATES, SPECFLUX_DIRS.ARCHIVES];

  for (const dir of taskStateDirs) {
    const fullPath = path.join(projectPath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    // Create .gitkeep to preserve empty directory
    const gitkeepPath = path.join(fullPath, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }
}

/**
 * Check if a project has the .specflux directory structure
 */
export function hasSpecfluxStructure(projectPath: string): boolean {
  const rootPath = path.join(projectPath, SPECFLUX_DIRS.ROOT);
  return fs.existsSync(rootPath);
}

/**
 * Get the full path to a specflux directory
 */
export function getSpecfluxPath(projectPath: string, dir: keyof typeof SPECFLUX_DIRS): string {
  return path.join(projectPath, SPECFLUX_DIRS[dir]);
}

/**
 * Read a markdown file with YAML frontmatter
 */
export function readMarkdownFile<T extends Record<string, unknown> = Record<string, unknown>>(
  filePath: string
): MarkdownFile<T> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    frontmatter: data as T,
    content: content.trim(),
    path: filePath,
  };
}

/**
 * Remove undefined values from an object (gray-matter can't serialize undefined)
 */
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Write a markdown file with YAML frontmatter
 */
export function writeMarkdownFile<T extends Record<string, unknown>>(
  filePath: string,
  frontmatter: T,
  content: string
): void {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Remove undefined values before serializing
  const cleanFrontmatter = removeUndefinedValues(frontmatter);
  const fileContent = matter.stringify(content, cleanFrontmatter);
  fs.writeFileSync(filePath, fileContent);
}

/**
 * List all markdown files in a directory
 */
export function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(dirPath, file));
}

/**
 * Delete a markdown file
 */
export function deleteMarkdownFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}

/**
 * Generate a safe filename from a title
 */
export function generateFilename(title: string, extension = '.md'): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + extension
  );
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// === PRD File Operations ===

/**
 * Create a new PRD file
 */
export function createPrdFile(
  projectPath: string,
  title: string,
  content: string,
  author?: string
): MarkdownFile<PrdFrontmatter> {
  const filename = generateFilename(title);
  const filePath = path.join(projectPath, SPECFLUX_DIRS.PRDS, filename);
  const now = getCurrentTimestamp();

  const frontmatter: PrdFrontmatter = {
    title,
    status: 'draft',
    created_at: now,
    updated_at: now,
    author,
  };

  writeMarkdownFile(filePath, frontmatter, content);

  return {
    frontmatter,
    content,
    path: filePath,
  };
}

/**
 * List all PRD files in a project
 */
export function listPrdFiles(projectPath: string): MarkdownFile<PrdFrontmatter>[] {
  const prdsPath = path.join(projectPath, SPECFLUX_DIRS.PRDS);
  const files = listMarkdownFiles(prdsPath);

  return files
    .map((file) => readMarkdownFile<PrdFrontmatter>(file))
    .filter((file): file is MarkdownFile<PrdFrontmatter> => file !== null);
}

// === Epic File Operations ===

/**
 * Create a new Epic file
 */
export function createEpicFile(
  projectPath: string,
  title: string,
  content: string,
  prdPath?: string,
  author?: string
): MarkdownFile<EpicFrontmatter> {
  const filename = generateFilename(title);
  const filePath = path.join(projectPath, SPECFLUX_DIRS.EPICS, filename);
  const now = getCurrentTimestamp();

  const frontmatter: EpicFrontmatter = {
    title,
    status: 'planning',
    prd_path: prdPath,
    created_at: now,
    updated_at: now,
    author,
  };

  writeMarkdownFile(filePath, frontmatter, content);

  return {
    frontmatter,
    content,
    path: filePath,
  };
}

/**
 * List all Epic files in a project
 */
export function listEpicFiles(projectPath: string): MarkdownFile<EpicFrontmatter>[] {
  const epicsPath = path.join(projectPath, SPECFLUX_DIRS.EPICS);
  const files = listMarkdownFiles(epicsPath);

  return files
    .map((file) => readMarkdownFile<EpicFrontmatter>(file))
    .filter((file): file is MarkdownFile<EpicFrontmatter> => file !== null);
}

// === Task Context File Operations ===

/**
 * Create a task context file for agent consumption
 */
export function createTaskContextFile(
  projectPath: string,
  taskId: number,
  title: string,
  description: string,
  dependencies: number[] = [],
  chainInputs: string[] = []
): MarkdownFile<TaskContextFrontmatter> {
  const filename = `task-${taskId}.md`;
  const filePath = path.join(projectPath, SPECFLUX_DIRS.TASKS, filename);
  const now = getCurrentTimestamp();

  const frontmatter: TaskContextFrontmatter = {
    task_id: taskId,
    title,
    dependencies,
    chain_inputs: chainInputs,
    created_at: now,
  };

  writeMarkdownFile(filePath, frontmatter, description);

  return {
    frontmatter,
    content: description,
    path: filePath,
  };
}

/**
 * Get task context file by task ID
 */
export function getTaskContextFile(
  projectPath: string,
  taskId: number
): MarkdownFile<TaskContextFrontmatter> | null {
  const filename = `task-${taskId}.md`;
  const filePath = path.join(projectPath, SPECFLUX_DIRS.TASKS, filename);
  return readMarkdownFile<TaskContextFrontmatter>(filePath);
}

// === Chain Output File Operations ===

/**
 * Save chain output for a task
 */
export function saveChainOutput(projectPath: string, taskId: number, summary: string): string {
  const filename = `task-${taskId}.md`;
  const filePath = path.join(projectPath, SPECFLUX_DIRS.CHAIN_OUTPUTS, filename);

  const frontmatter = {
    task_id: taskId,
    created_at: getCurrentTimestamp(),
  };

  writeMarkdownFile(filePath, frontmatter, summary);
  return filePath;
}

/**
 * Get chain output for a task
 */
export function getChainOutput(
  projectPath: string,
  taskId: number
): MarkdownFile<{ task_id: number; created_at: string }> | null {
  const filename = `task-${taskId}.md`;
  const filePath = path.join(projectPath, SPECFLUX_DIRS.CHAIN_OUTPUTS, filename);
  return readMarkdownFile(filePath);
}

/**
 * Get chain outputs for multiple tasks (for dependency injection)
 */
export function getChainOutputsForTasks(
  projectPath: string,
  taskIds: number[]
): MarkdownFile<{ task_id: number; created_at: string }>[] {
  return taskIds
    .map((id) => getChainOutput(projectPath, id))
    .filter(
      (output): output is MarkdownFile<{ task_id: number; created_at: string }> => output !== null
    );
}
