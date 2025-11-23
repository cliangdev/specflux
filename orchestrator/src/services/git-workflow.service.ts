import { execSync } from 'child_process';
import { getWorktree } from './worktree.service';
import { getTaskById } from './task.service';
import { getProjectById, getProjectConfig } from './project.service';
import { ValidationError } from '../types';

export interface WorktreeChanges {
  hasChanges: boolean;
  filesChanged: string[];
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
 * Check if a worktree has uncommitted changes
 */
export function getWorktreeChanges(worktreePath: string): WorktreeChanges {
  try {
    // Check for any changes (staged or unstaged)
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).trim();

    if (!status) {
      return {
        hasChanges: false,
        filesChanged: [],
        insertions: 0,
        deletions: 0,
      };
    }

    // Get list of changed files
    const filesChanged = status
      .split('\n')
      .map((line) => line.substring(3).trim())
      .filter(Boolean);

    // Get diff stats
    let insertions = 0;
    let deletions = 0;
    try {
      const diffStat = execSync('git diff --stat HEAD 2>/dev/null || git diff --stat', {
        cwd: worktreePath,
        encoding: 'utf-8',
      }).trim();

      const statMatch = diffStat.match(/(\d+) insertion|(\d+) deletion/g);
      if (statMatch) {
        statMatch.forEach((match) => {
          const num = parseInt(match.match(/\d+/)?.[0] ?? '0', 10);
          if (match.includes('insertion')) insertions = num;
          if (match.includes('deletion')) deletions = num;
        });
      }
    } catch {
      // Ignore diff stat errors
    }

    return {
      hasChanges: true,
      filesChanged,
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
 * Get the diff for a worktree (for review UI)
 */
export function getWorktreeDiff(worktreePath: string): string {
  try {
    // Get diff of all changes
    const diff = execSync('git diff HEAD 2>/dev/null || git diff', {
      cwd: worktreePath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    });

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
 */
export function createPullRequest(taskId: number): PullRequestResult {
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

  try {
    // Ensure branch is pushed
    const pushResult = pushWorktreeBranch(taskId);
    if (!pushResult.success) {
      return {
        success: false,
        prNumber: null,
        prUrl: null,
        message: pushResult.message,
      };
    }

    // Create PR using gh CLI
    const prTitle = `feat(task-${taskId}): ${task.title}`;
    const prBody = `## Summary
- Task #${taskId}: ${task.title}
${task.description ? `\n${task.description}` : ''}

## Changes
This PR was auto-generated by SpecFlux after task completion.

---
🤖 Generated with SpecFlux`;

    const prOutput = execSync(
      `gh pr create --title "${prTitle.replace(/"/g, '\\"')}" --body "${prBody.replace(/"/g, '\\"')}" --base ${targetBranch} --head ${worktree.branch}`,
      {
        cwd: worktree.path,
        encoding: 'utf-8',
      }
    ).trim();

    // Parse PR URL from output
    const prUrl = prOutput;
    const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
    const prNumber = prNumberMatch?.[1] ? parseInt(prNumberMatch[1], 10) : null;

    return {
      success: true,
      prNumber,
      prUrl,
      message: `Created PR #${prNumber}`,
    };
  } catch (error) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `Failed to create PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Full workflow: commit changes and create PR
 */
export function commitAndCreatePR(taskId: number): { commit: CommitResult; pr: PullRequestResult } {
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
  const prResult = createPullRequest(taskId);

  return {
    commit: commitResult,
    pr: prResult,
  };
}
