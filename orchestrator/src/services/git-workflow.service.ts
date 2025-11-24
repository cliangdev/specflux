import { execSync } from 'child_process';
import { getWorktree } from './worktree.service';
import { getTaskById } from './task.service';
import { getProjectById, getProjectConfig } from './project.service';
import { ValidationError } from '../types';
import { createPullRequest as createPRViaGitHub, pushBranch } from './github.service';

export interface WorktreeChanges {
  hasChanges: boolean;
  filesChanged: string[];
  newFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  insertions: number;
  deletions: number;
}

export interface CommitResult {
  success: boolean;
  commitHash: string | null;
  message: string;
}

export interface PullRequestResult {
  success: boolean;
  prNumber: number | null;
  prUrl: string | null;
  message: string;
}

/**
 * Check if a worktree has changes (committed or uncommitted) compared to base branch
 */
export function getWorktreeChanges(
  worktreePath: string,
  baseBranch: string = 'main'
): WorktreeChanges {
  try {
    // First check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).trim();

    // Also check for committed changes compared to base branch
    let filesChanged: string[] = [];
    let insertions = 0;
    let deletions = 0;

    // Get committed changes compared to base branch
    try {
      // Fetch to ensure we have latest remote refs
      execSync('git fetch origin 2>/dev/null || true', {
        cwd: worktreePath,
        encoding: 'utf-8',
      });

      // Compare against origin/baseBranch or baseBranch
      const compareRef = `origin/${baseBranch}`;
      const diffNameOnly = execSync(
        `git diff --name-only ${compareRef}...HEAD 2>/dev/null || git diff --name-only ${baseBranch}...HEAD 2>/dev/null || echo ""`,
        {
          cwd: worktreePath,
          encoding: 'utf-8',
        }
      ).trim();

      if (diffNameOnly) {
        filesChanged = diffNameOnly.split('\n').filter(Boolean);
      }

      // Get stats for committed changes
      const diffStat = execSync(
        `git diff --stat ${compareRef}...HEAD 2>/dev/null || git diff --stat ${baseBranch}...HEAD 2>/dev/null || echo ""`,
        {
          cwd: worktreePath,
          encoding: 'utf-8',
        }
      ).trim();

      const insertionMatch = diffStat.match(/(\d+) insertion/);
      const deletionMatch = diffStat.match(/(\d+) deletion/);
      if (insertionMatch) insertions = parseInt(insertionMatch[1]!, 10);
      if (deletionMatch) deletions = parseInt(deletionMatch[1]!, 10);
    } catch {
      // Ignore diff errors, fall back to uncommitted changes only
    }

    // Parse uncommitted files from git status --porcelain
    // Format: XY filename where X=staged status, Y=unstaged status
    // Common codes: A=added, M=modified, D=deleted, ?=untracked
    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];

    if (status) {
      const lines = status.split('\n').filter(Boolean);
      for (const line of lines) {
        const statusCode = line.substring(0, 2);
        const filePath = line.substring(3).trim();

        if (!filePath) continue;

        // Add to filesChanged if not already there
        if (!filesChanged.includes(filePath)) {
          filesChanged.push(filePath);
        }

        // Categorize by status code
        // X or Y can be: A(added), M(modified), D(deleted), R(renamed), C(copied), U(updated), ?(untracked)
        const staged = statusCode[0];
        const unstaged = statusCode[1];

        if (staged === '?' || staged === 'A' || unstaged === 'A') {
          // New/untracked file
          if (!newFiles.includes(filePath)) {
            newFiles.push(filePath);
          }
        } else if (staged === 'D' || unstaged === 'D') {
          // Deleted file
          if (!deletedFiles.includes(filePath)) {
            deletedFiles.push(filePath);
          }
        } else if (staged === 'M' || unstaged === 'M' || staged === 'R' || unstaged === 'R') {
          // Modified or renamed file
          if (!modifiedFiles.includes(filePath)) {
            modifiedFiles.push(filePath);
          }
        }
      }
    }

    return {
      hasChanges: filesChanged.length > 0,
      filesChanged,
      newFiles,
      modifiedFiles,
      deletedFiles,
      insertions,
      deletions,
    };
  } catch (error) {
    throw new ValidationError(
      `Failed to check worktree changes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if there are uncommitted changes for a task's worktree
 */
export function hasUncommittedChanges(taskId: number): boolean {
  const worktree = getWorktree(taskId);
  if (!worktree) {
    return false;
  }

  const changes = getWorktreeChanges(worktree.path);
  return changes.hasChanges;
}

/**
 * Get the diff for a worktree (for review UI) - compares against base branch
 */
export function getWorktreeDiff(worktreePath: string, baseBranch: string = 'main'): string {
  try {
    // Compare against base branch to show all changes in this branch
    const compareRef = `origin/${baseBranch}`;
    const diff = execSync(
      `git diff ${compareRef}...HEAD 2>/dev/null || git diff ${baseBranch}...HEAD 2>/dev/null || git diff HEAD`,
      {
        cwd: worktreePath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      }
    );

    return diff;
  } catch (error) {
    throw new ValidationError(
      `Failed to get diff: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Commit all changes in a worktree
 */
export function commitWorktreeChanges(taskId: number): CommitResult {
  const worktree = getWorktree(taskId);
  if (!worktree) {
    return {
      success: false,
      commitHash: null,
      message: `No worktree found for task ${taskId}`,
    };
  }

  const changes = getWorktreeChanges(worktree.path);
  if (!changes.hasChanges) {
    return {
      success: false,
      commitHash: null,
      message: 'No changes to commit',
    };
  }

  try {
    // Stage all changes
    execSync('git add -A', {
      cwd: worktree.path,
      stdio: 'pipe',
    });

    // Get task info for commit message
    const task = getTaskById(taskId);
    const commitMessage = `feat(task-${taskId}): ${task?.title ?? 'Complete task'}\n\nTask #${taskId} completed via SpecFlux agent.\n\n🤖 Generated with SpecFlux`;

    // Commit
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: worktree.path,
      stdio: 'pipe',
    });

    // Get commit hash
    const commitHash = execSync('git rev-parse HEAD', {
      cwd: worktree.path,
      encoding: 'utf-8',
    }).trim();

    return {
      success: true,
      commitHash,
      message: `Committed ${changes.filesChanged.length} file(s)`,
    };
  } catch (error) {
    return {
      success: false,
      commitHash: null,
      message: `Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Push worktree branch to remote
 */
export function pushWorktreeBranch(taskId: number): { success: boolean; message: string } {
  const worktree = getWorktree(taskId);
  if (!worktree) {
    return {
      success: false,
      message: `No worktree found for task ${taskId}`,
    };
  }

  try {
    // Push to origin
    execSync(`git push -u origin ${worktree.branch}`, {
      cwd: worktree.path,
      stdio: 'pipe',
    });

    return {
      success: true,
      message: `Pushed branch ${worktree.branch} to origin`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a pull request for a task's worktree branch
 * Uses GitHub API with fallback to gh CLI and manual URL
 */
export async function createPullRequest(taskId: number): Promise<PullRequestResult> {
  const worktree = getWorktree(taskId);
  if (!worktree) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `No worktree found for task ${taskId}`,
    };
  }

  // Get task and project info
  const task = getTaskById(taskId);
  if (!task) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `Task ${taskId} not found`,
    };
  }

  const project = getProjectById(task.project_id);
  if (!project) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `Project not found for task ${taskId}`,
    };
  }

  // Get target branch from project config
  const config = getProjectConfig(task.project_id);
  const targetBranch = config?.default_pr_target_branch ?? 'main';

  // Ensure branch is pushed
  const pushResult = pushBranch(worktree.path, worktree.branch);
  if (!pushResult.success) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: pushResult.message,
    };
  }

  // Create PR using GitHub service (API with fallback)
  const prTitle = `feat(task-${taskId}): ${task.title}`;
  const prBody = `## Summary
- Task #${taskId}: ${task.title}
${task.description ? `\n${task.description}` : ''}

## Changes
This PR was auto-generated by SpecFlux after task completion.

---
🤖 Generated with SpecFlux`;

  const result = await createPRViaGitHub(worktree.path, {
    title: prTitle,
    body: prBody,
    head: worktree.branch,
    base: targetBranch,
  });

  return {
    success: result.success,
    prNumber: result.prNumber,
    prUrl: result.prUrl,
    message: result.message,
  };
}

/**
 * Full workflow: commit changes and create PR
 */
export async function commitAndCreatePR(
  taskId: number
): Promise<{ commit: CommitResult; pr: PullRequestResult }> {
  // First commit
  const commitResult = commitWorktreeChanges(taskId);

  if (!commitResult.success) {
    return {
      commit: commitResult,
      pr: {
        success: false,
        prNumber: null,
        prUrl: null,
        message: 'Skipped PR creation due to commit failure',
      },
    };
  }

  // Then create PR
  const prResult = await createPullRequest(taskId);

  return {
    commit: commitResult,
    pr: prResult,
  };
}
