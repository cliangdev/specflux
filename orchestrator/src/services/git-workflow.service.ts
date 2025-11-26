import { execSync } from 'child_process';
import { getWorktree } from './worktree.service';
import { getTaskById } from './task.service';
import { getProjectById, getProjectConfig } from './project.service';
import { ValidationError } from '../types';
import { createPullRequest as createPRViaGitHub, pushBranch } from './github.service';

// Patterns for files to exclude from file changes display (AI context files)
const EXCLUDED_FILE_PATTERNS = [
  /^CLAUDE\.md$/i, // CLAUDE.md at root
  /\/CLAUDE\.md$/i, // CLAUDE.md in subdirectories
  /^\.specflux\//i, // .specflux/ directory
  /^\.claude\//i, // .claude/ directory
];

function shouldExcludeFile(filePath: string): boolean {
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

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
    const newFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const deletedFiles: string[] = [];
    const filesChanged: string[] = [];
    let insertions = 0;
    let deletions = 0;

    // Get committed changes compared to base branch using --name-status
    try {
      // Fetch to ensure we have latest remote refs
      execSync('git fetch origin 2>/dev/null || true', {
        cwd: worktreePath,
        encoding: 'utf-8',
      });

      // Compare against origin/baseBranch or baseBranch using --name-status to get change types
      const compareRef = `origin/${baseBranch}`;
      const diffNameStatus = execSync(
        `git diff --name-status ${compareRef}...HEAD 2>/dev/null || git diff --name-status ${baseBranch}...HEAD 2>/dev/null || echo ""`,
        {
          cwd: worktreePath,
          encoding: 'utf-8',
        }
      ).trim();

      if (diffNameStatus) {
        const lines = diffNameStatus.split('\n').filter(Boolean);
        for (const line of lines) {
          // Format: STATUS<tab>filename (e.g., "A\tfile.txt" or "M\tfile.txt")
          const [status, ...filenameParts] = line.split('\t');
          const filePath = filenameParts.join('\t'); // Handle filenames with tabs

          if (!filePath) continue;

          filesChanged.push(filePath);

          // Categorize by status
          if (status === 'A') {
            newFiles.push(filePath);
          } else if (status === 'D') {
            deletedFiles.push(filePath);
          } else if (status === 'M' || status?.startsWith('R')) {
            modifiedFiles.push(filePath);
          }
        }
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

    // Also check for uncommitted changes from git status
    // Note: Don't trim() as it removes leading spaces which are part of the status code format
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
    }).replace(/\n$/, '');

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

        // Categorize by status code (only if not already categorized from committed changes)
        const staged = statusCode[0];
        const unstaged = statusCode[1];

        if (staged === '?' || staged === 'A' || unstaged === 'A') {
          if (!newFiles.includes(filePath)) {
            newFiles.push(filePath);
          }
        } else if (staged === 'D' || unstaged === 'D') {
          if (!deletedFiles.includes(filePath)) {
            deletedFiles.push(filePath);
          }
        } else if (staged === 'M' || unstaged === 'M' || staged === 'R' || unstaged === 'R') {
          if (!modifiedFiles.includes(filePath)) {
            modifiedFiles.push(filePath);
          }
        }
      }
    }

    // Filter out excluded files (AI context files like CLAUDE.md, .specflux/, .claude/)
    const filteredFilesChanged = filesChanged.filter((f) => !shouldExcludeFile(f));
    const filteredNewFiles = newFiles.filter((f) => !shouldExcludeFile(f));
    const filteredModifiedFiles = modifiedFiles.filter((f) => !shouldExcludeFile(f));
    const filteredDeletedFiles = deletedFiles.filter((f) => !shouldExcludeFile(f));

    return {
      hasChanges: filteredFilesChanged.length > 0,
      filesChanged: filteredFilesChanged,
      newFiles: filteredNewFiles,
      modifiedFiles: filteredModifiedFiles,
      deletedFiles: filteredDeletedFiles,
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
export function hasUncommittedChanges(taskId: number, projectPath: string): boolean {
  const worktree = getWorktree(taskId, projectPath);
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
  // Get task and project to enable disk-based worktree lookup
  const task = getTaskById(taskId);
  if (!task) {
    return {
      success: false,
      commitHash: null,
      message: `Task ${taskId} not found`,
    };
  }

  const project = getProjectById(task.project_id);
  if (!project?.local_path) {
    return {
      success: false,
      commitHash: null,
      message: `Project not found for task ${taskId}`,
    };
  }

  const worktree = getWorktree(taskId, project.local_path);
  if (!worktree) {
    return {
      success: false,
      commitHash: null,
      message: `No worktree found for task ${taskId}`,
    };
  }

  // Check for uncommitted changes directly via git status (not getWorktreeChanges which includes committed changes)
  const gitStatus = execSync('git status --porcelain', {
    cwd: worktree.path,
    encoding: 'utf-8',
  }).trim();

  console.log(
    `[commitWorktreeChanges] git status output: "${gitStatus.substring(0, 100)}${gitStatus.length > 100 ? '...' : ''}"`
  );

  if (!gitStatus) {
    console.log(
      '[commitWorktreeChanges] No uncommitted changes to commit (changes may already be committed)'
    );
    return {
      success: false,
      commitHash: null,
      message: 'No changes to commit',
    };
  }

  // Parse git status and filter out excluded files (AI context files)
  const statusLines = gitStatus.split('\n').filter(Boolean);
  const filesToStage: string[] = [];

  for (const line of statusLines) {
    const filePath = line.substring(3).trim();
    if (filePath && !shouldExcludeFile(filePath)) {
      filesToStage.push(filePath);
    }
  }

  if (filesToStage.length === 0) {
    console.log(
      '[commitWorktreeChanges] No non-excluded files to commit (only AI context files changed)'
    );
    return {
      success: false,
      commitHash: null,
      message: 'No changes to commit (only AI context files changed)',
    };
  }

  console.log(
    `[commitWorktreeChanges] Staging ${filesToStage.length} files (excluded ${statusLines.length - filesToStage.length} AI context files)`
  );

  try {
    // Stage only non-excluded files
    for (const file of filesToStage) {
      execSync(`git add -- "${file.replace(/"/g, '\\"')}"`, {
        cwd: worktree.path,
        stdio: 'pipe',
      });
    }

    // Build commit message (task already fetched above)
    const commitMessage = `feat(task-${taskId}): ${task.title ?? 'Complete task'}\n\nTask #${taskId} completed via SpecFlux agent.\n\n🤖 Generated with SpecFlux`;

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
      message: `Committed ${filesToStage.length} file(s)`,
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
export function pushWorktreeBranch(
  taskId: number,
  projectPath: string
): { success: boolean; message: string } {
  const worktree = getWorktree(taskId, projectPath);
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
  // Get task and project info first (needed for disk-based worktree lookup)
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
  if (!project?.local_path) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `Project not found for task ${taskId}`,
    };
  }

  const worktree = getWorktree(taskId, project.local_path);
  if (!worktree) {
    return {
      success: false,
      prNumber: null,
      prUrl: null,
      message: `No worktree found for task ${taskId}`,
    };
  }

  // Get target branch from project config
  const config = getProjectConfig(task.project_id);
  const targetBranch = config?.default_pr_target_branch ?? 'main';

  // Ensure branch is pushed
  console.log(`[createPullRequest] Pushing branch ${worktree.branch}...`);
  const pushResult = pushBranch(worktree.path, worktree.branch);
  console.log(
    `[createPullRequest] Push result: success=${pushResult.success}, message=${pushResult.message}`
  );
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

  console.log(`[createPullRequest] Creating PR: head=${worktree.branch}, base=${targetBranch}`);
  const result = await createPRViaGitHub(worktree.path, {
    title: prTitle,
    body: prBody,
    head: worktree.branch,
    base: targetBranch,
  });
  console.log(
    `[createPullRequest] PR result: success=${result.success}, prNumber=${result.prNumber}, method=${result.method}, message=${result.message}`
  );

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
  // First try to commit any uncommitted changes
  const commitResult = commitWorktreeChanges(taskId);

  // Even if commit fails (e.g., no uncommitted changes because agent already committed),
  // we should still try to create the PR if there are committed changes vs base branch
  const isNothingToCommit =
    commitResult.message.includes('No changes to commit') ||
    commitResult.message.includes('nothing to commit') ||
    commitResult.message.includes('working tree clean');
  if (!commitResult.success && !isNothingToCommit) {
    // Real commit failure (not just "nothing to commit")
    console.warn(`[commitAndCreatePR] Real commit failure: ${commitResult.message}`);
    return {
      commit: commitResult,
      pr: {
        success: false,
        prNumber: null,
        prUrl: null,
        message: `Skipped PR creation due to commit failure: ${commitResult.message}`,
      },
    };
  }
  console.log(
    `[commitAndCreatePR] Proceeding to PR creation (commit success=${commitResult.success}, message=${commitResult.message})`
  );

  // Create PR (even if commit returned "no changes" - the changes might already be committed)
  const prResult = await createPullRequest(taskId);

  return {
    commit: commitResult,
    pr: prResult,
  };
}
