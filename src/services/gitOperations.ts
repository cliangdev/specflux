/**
 * Git Operations Service
 *
 * Provides TypeScript interface for native git operations via Tauri IPC.
 * Uses the Rust git module (src-tauri/src/git.rs) for efficient git operations.
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * Git status information for a repository
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Whether there are any changes (staged, unstaged, or untracked) */
  hasChanges: boolean;
  /** Files that have been staged for commit */
  stagedFiles: string[];
  /** Files that have been modified but not staged */
  unstagedFiles: string[];
  /** Files that are not tracked by git */
  untrackedFiles: string[];
}

/** Raw git status from Rust (snake_case) */
interface RawGitStatus {
  branch: string;
  has_changes: boolean;
  staged_files: string[];
  unstaged_files: string[];
  untracked_files: string[];
}

/**
 * Clone a repository to a target directory.
 *
 * @param repoUrl - The git repository URL (HTTPS or SSH)
 * @param targetDir - The local directory path to clone into
 * @throws Error if clone fails
 */
export async function cloneRepo(
  repoUrl: string,
  targetDir: string,
): Promise<void> {
  await invoke("git_clone_repo", { repoUrl, targetDir });
}

/**
 * Add specific files to the staging area.
 *
 * @param repoDir - The repository directory path
 * @param files - Array of file paths to add (relative to repo root)
 * @throws Error if git add fails
 */
export async function addFiles(
  repoDir: string,
  files: string[],
): Promise<void> {
  await invoke("git_add_files", { repoDir, files });
}

/**
 * Auto-commit: add all changes and commit with a message.
 * This is a convenience method that does `git add .` followed by `git commit -m`.
 *
 * @param repoDir - The repository directory path
 * @param message - The commit message
 * @throws Error if add or commit fails
 */
export async function autoCommit(
  repoDir: string,
  message: string,
): Promise<void> {
  await invoke("git_auto_commit", { repoDir, message });
}

/**
 * Commit staged changes with a message.
 *
 * @param repoDir - The repository directory path
 * @param message - The commit message
 * @throws Error if commit fails
 */
export async function commitChanges(
  repoDir: string,
  message: string,
): Promise<void> {
  await invoke("git_commit_changes", { repoDir, message });
}

/**
 * Push commits to the remote repository.
 *
 * @param repoDir - The repository directory path
 * @throws Error if push fails
 */
export async function pushChanges(repoDir: string): Promise<void> {
  await invoke("git_push_changes", { repoDir });
}

/**
 * Pull commits from the remote repository.
 *
 * @param repoDir - The repository directory path
 * @throws Error if pull fails
 */
export async function pullChanges(repoDir: string): Promise<void> {
  await invoke("git_pull_changes", { repoDir });
}

/**
 * Fetch from the remote repository without merging.
 *
 * @param repoDir - The repository directory path
 * @throws Error if fetch fails
 */
export async function fetchRemote(repoDir: string): Promise<void> {
  await invoke("git_fetch_remote", { repoDir });
}

/**
 * Get the current status of a repository.
 *
 * @param repoDir - The repository directory path
 * @returns Git status with branch, changes, and file lists
 * @throws Error if status check fails or not a git repository
 */
export async function getGitStatus(repoDir: string): Promise<GitStatus> {
  const status = await invoke<RawGitStatus>("git_get_status", { repoDir });

  // Convert snake_case from Rust to camelCase for TypeScript
  return {
    branch: status.branch,
    hasChanges: status.has_changes,
    stagedFiles: status.staged_files,
    unstagedFiles: status.unstaged_files,
    untrackedFiles: status.untracked_files,
  };
}
