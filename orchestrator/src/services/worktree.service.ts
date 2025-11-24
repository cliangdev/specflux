import { execSync, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ValidationError } from '../types';

export interface Worktree {
  path: string;
  branch: string;
  taskId: number;
}

// In-memory tracking of worktrees per task
const worktreeMap = new Map<number, Worktree>();

/**
 * Generate branch name for a task
 */
export function generateBranchName(taskId: number, taskTitle: string): string {
  const slug = taskTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  return `task/${taskId}-${slug}`;
}

/**
 * Get worktree base directory for a project
 */
export function getWorktreeBaseDir(projectPath: string): string {
  return path.join(projectPath, '.specflux', 'worktrees');
}

/**
 * Create a git worktree for a task
 * @param baseBranch - The branch to base the new branch on (defaults to 'main')
 */
export function createWorktree(
  taskId: number,
  projectPath: string,
  branchName: string,
  baseBranch: string = 'main'
): Worktree {
  // Check if worktree already exists for this task
  if (worktreeMap.has(taskId)) {
    throw new ValidationError(`Worktree already exists for task ${taskId}`);
  }

  // Ensure project path exists and is a git repo
  if (!fs.existsSync(projectPath)) {
    throw new ValidationError(`Project path does not exist: ${projectPath}`);
  }

  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new ValidationError(`Project is not a git repository: ${projectPath}`);
  }

  // Create worktree base directory
  const worktreeBase = getWorktreeBaseDir(projectPath);
  if (!fs.existsSync(worktreeBase)) {
    fs.mkdirSync(worktreeBase, { recursive: true });
  }

  // Create worktree path
  const worktreePath = path.join(worktreeBase, `task-${taskId}`);

  // Check if worktree directory already exists - reuse if valid
  if (fs.existsSync(worktreePath)) {
    // Check if it's a valid git worktree by looking for .git file
    const gitFile = path.join(worktreePath, '.git');
    if (fs.existsSync(gitFile)) {
      // Valid worktree exists, reuse it
      const worktree: Worktree = {
        path: worktreePath,
        branch: branchName,
        taskId,
      };
      worktreeMap.set(taskId, worktree);
      return worktree;
    }
    // Directory exists but not a valid worktree, remove and recreate
    fs.rmSync(worktreePath, { recursive: true, force: true });
  }

  try {
    // Fetch latest from remote to ensure we have the base branch
    try {
      execSync(`git fetch origin ${baseBranch}`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    } catch {
      // Ignore fetch errors (might be offline or no remote)
    }

    // Create the branch if it doesn't exist
    try {
      execSync(`git rev-parse --verify ${branchName}`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    } catch {
      // Branch doesn't exist, create it from base branch
      execSync(
        `git branch ${branchName} origin/${baseBranch} 2>/dev/null || git branch ${branchName} ${baseBranch}`,
        {
          cwd: projectPath,
          stdio: 'pipe',
          shell: '/bin/bash',
        }
      );
    }

    // Create the worktree
    execSync(`git worktree add "${worktreePath}" ${branchName}`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    const worktree: Worktree = {
      path: worktreePath,
      branch: branchName,
      taskId,
    };

    worktreeMap.set(taskId, worktree);
    return worktree;
  } catch (error) {
    // Clean up on failure
    if (fs.existsSync(worktreePath)) {
      fs.rmSync(worktreePath, { recursive: true, force: true });
    }
    throw new ValidationError(
      `Failed to create worktree: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Remove a git worktree for a task
 */
export function removeWorktree(taskId: number, projectPath: string): void {
  const worktree = worktreeMap.get(taskId);

  if (!worktree) {
    // Check if there's a worktree on disk that we need to clean up
    const worktreePath = path.join(getWorktreeBaseDir(projectPath), `task-${taskId}`);
    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
          stdio: 'pipe',
        });
      } catch {
        // Force remove directory if git command fails
        fs.rmSync(worktreePath, { recursive: true, force: true });
        execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe' });
      }
    }
    return;
  }

  try {
    // Remove the worktree using git
    execSync(`git worktree remove "${worktree.path}" --force`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
  } catch {
    // Force remove directory if git command fails
    if (fs.existsSync(worktree.path)) {
      fs.rmSync(worktree.path, { recursive: true, force: true });
    }
    execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe' });
  }

  worktreeMap.delete(taskId);
}

/**
 * Get worktree info for a task
 * First checks in-memory map, then falls back to checking disk
 */
export function getWorktree(taskId: number): Worktree | null {
  // Check in-memory first
  const cached = worktreeMap.get(taskId);
  if (cached) return cached;

  return null;
}

/**
 * Get worktree for a task by checking the project's worktree directory on disk
 * Use this when the worktree might exist but not be tracked in memory (e.g., after server restart)
 */
export function getWorktreeFromDisk(taskId: number, projectPath: string): Worktree | null {
  const worktreePath = path.join(getWorktreeBaseDir(projectPath), `task-${taskId}`);

  // Check if the worktree directory exists and is valid
  if (!fs.existsSync(worktreePath)) {
    return null;
  }

  const gitFile = path.join(worktreePath, '.git');
  if (!fs.existsSync(gitFile)) {
    return null;
  }

  // Get the branch name from git
  try {
    const branch = execSync('git branch --show-current', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).trim();

    const worktree: Worktree = {
      path: worktreePath,
      branch,
      taskId,
    };

    // Cache it for future lookups
    worktreeMap.set(taskId, worktree);

    return worktree;
  } catch {
    return null;
  }
}

/**
 * List all tracked worktrees
 */
export function listWorktrees(): Worktree[] {
  return Array.from(worktreeMap.values());
}

/**
 * Check if worktree exists for a task
 */
export function hasWorktree(taskId: number): boolean {
  return worktreeMap.has(taskId);
}

/**
 * Async version of createWorktree for non-blocking operations
 */
export function createWorktreeAsync(
  taskId: number,
  projectPath: string,
  branchName: string
): Promise<Worktree> {
  return new Promise((resolve, reject) => {
    try {
      // Synchronous validations
      if (worktreeMap.has(taskId)) {
        throw new ValidationError(`Worktree already exists for task ${taskId}`);
      }

      if (!fs.existsSync(projectPath)) {
        throw new ValidationError(`Project path does not exist: ${projectPath}`);
      }

      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) {
        throw new ValidationError(`Project is not a git repository: ${projectPath}`);
      }

      const worktreeBase = getWorktreeBaseDir(projectPath);
      if (!fs.existsSync(worktreeBase)) {
        fs.mkdirSync(worktreeBase, { recursive: true });
      }

      const worktreePath = path.join(worktreeBase, `task-${taskId}`);

      if (fs.existsSync(worktreePath)) {
        throw new ValidationError(`Worktree path already exists: ${worktreePath}`);
      }

      // Create branch if needed
      exec(`git rev-parse --verify ${branchName}`, { cwd: projectPath }, (err) => {
        const createWorktreeCmd = () => {
          exec(
            `git worktree add "${worktreePath}" ${branchName}`,
            { cwd: projectPath },
            (wtErr) => {
              if (wtErr) {
                if (fs.existsSync(worktreePath)) {
                  fs.rmSync(worktreePath, { recursive: true, force: true });
                }
                reject(new ValidationError(`Failed to create worktree: ${wtErr.message}`));
                return;
              }

              const worktree: Worktree = {
                path: worktreePath,
                branch: branchName,
                taskId,
              };

              worktreeMap.set(taskId, worktree);
              resolve(worktree);
            }
          );
        };

        if (err) {
          // Branch doesn't exist, create it
          exec(`git branch ${branchName}`, { cwd: projectPath }, (branchErr) => {
            if (branchErr) {
              reject(new ValidationError(`Failed to create branch: ${branchErr.message}`));
              return;
            }
            createWorktreeCmd();
          });
        } else {
          createWorktreeCmd();
        }
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Clear worktree tracking (for testing)
 */
export function clearWorktreeTracking(): void {
  worktreeMap.clear();
}

/**
 * Clean up worktree after task completion
 * Removes the worktree directory and prunes git worktree list
 */
export function cleanupWorktree(
  taskId: number,
  projectPath: string
): { success: boolean; message: string } {
  const worktree = worktreeMap.get(taskId);
  const worktreePath =
    worktree?.path ?? path.join(getWorktreeBaseDir(projectPath), `task-${taskId}`);

  try {
    if (fs.existsSync(worktreePath)) {
      // Try to remove using git first
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
          stdio: 'pipe',
        });
      } catch {
        // If git command fails, force remove the directory
        fs.rmSync(worktreePath, { recursive: true, force: true });
        execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe' });
      }
    }

    worktreeMap.delete(taskId);

    return {
      success: true,
      message: `Cleaned up worktree for task ${taskId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to cleanup worktree: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Clean up all stale worktrees for a project
 * Called on app startup to remove orphaned worktrees
 */
export function cleanupStaleWorktrees(projectPath: string): { cleaned: number; errors: string[] } {
  const worktreeBase = getWorktreeBaseDir(projectPath);
  const cleaned: string[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(worktreeBase)) {
    return { cleaned: 0, errors: [] };
  }

  try {
    // Get list of worktree directories
    const dirs = fs.readdirSync(worktreeBase);

    for (const dir of dirs) {
      // Only process task-* directories
      if (!dir.startsWith('task-')) continue;

      const worktreePath = path.join(worktreeBase, dir);
      const taskIdMatch = dir.match(/^task-(\d+)$/);
      const taskId = taskIdMatch?.[1] ? parseInt(taskIdMatch[1], 10) : null;

      // Check if this worktree is tracked in memory
      if (taskId && worktreeMap.has(taskId)) {
        continue; // Skip active worktrees
      }

      // Remove stale worktree
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: projectPath,
          stdio: 'pipe',
        });
        cleaned.push(dir);
      } catch {
        // Try force remove
        try {
          fs.rmSync(worktreePath, { recursive: true, force: true });
          cleaned.push(dir);
        } catch (e) {
          errors.push(
            `Failed to remove ${dir}: ${e instanceof Error ? e.message : 'Unknown error'}`
          );
        }
      }
    }

    // Prune git worktree list
    try {
      execSync('git worktree prune', { cwd: projectPath, stdio: 'pipe' });
    } catch {
      // Ignore prune errors
    }

    return { cleaned: cleaned.length, errors };
  } catch (error) {
    return {
      cleaned: 0,
      errors: [
        `Failed to scan worktrees: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    };
  }
}
