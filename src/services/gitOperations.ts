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

/**
 * Remote repository information
 */
export interface RemoteInfo {
  /** Full remote URL */
  url: string;
  /** Repository owner (e.g., "octocat") */
  owner: string;
  /** Repository name (e.g., "hello-world") */
  repo: string;
}

/**
 * Parse GitHub owner/repo from remote URL.
 *
 * @param url - The remote URL (HTTPS or SSH format)
 * @returns Parsed owner and repo, or undefined if not a GitHub URL
 */
export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | undefined {
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return undefined;
}

/**
 * Get the remote URL for a repository.
 * Uses shell command since Tauri doesn't have a native git remote command.
 *
 * @param repoDir - The repository directory path
 * @param remoteName - The remote name (default: "origin")
 * @returns The remote URL, or undefined if not configured
 */
export async function getRemoteUrl(
  repoDir: string,
  remoteName: string = "origin",
): Promise<string | undefined> {
  try {
    // Dynamic import to avoid issues in non-Tauri environments (tests)
    const { Command } = await import("@tauri-apps/plugin-shell");
    const command = Command.create("git", [
      "-C",
      repoDir,
      "remote",
      "get-url",
      remoteName,
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim();
    }
  } catch {
    // No remote configured or git command failed
  }
  return undefined;
}

/**
 * Get remote repository information including parsed GitHub owner/repo.
 *
 * @param repoDir - The repository directory path
 * @param remoteName - The remote name (default: "origin")
 * @returns Remote info with URL, owner, and repo, or undefined if not a GitHub remote
 */
export async function getRemoteInfo(
  repoDir: string,
  remoteName: string = "origin",
): Promise<RemoteInfo | undefined> {
  const url = await getRemoteUrl(repoDir, remoteName);
  if (!url) return undefined;

  const parsed = parseGitHubUrl(url);
  if (!parsed) return undefined;

  return {
    url,
    owner: parsed.owner,
    repo: parsed.repo,
  };
}

/**
 * Normalize a git URL for comparison.
 * Strips trailing .git, lowercases, and handles protocol variations.
 */
function normalizeGitUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

/**
 * Set the remote URL for a repository.
 *
 * SAFETY: This function will NOT overwrite an existing remote that points
 * to a different repository. This prevents accidentally changing a project's
 * remote to point to an unrelated SpecFlux spec repository.
 *
 * @param repoDir - The repository directory path
 * @param url - The remote URL to set
 * @param remoteName - The remote name (default: "origin")
 * @throws Error if the remote already exists with a different URL
 * @throws Error if the operation fails
 */
export async function setRemoteUrl(
  repoDir: string,
  url: string,
  remoteName: string = "origin",
): Promise<void> {
  const existingUrl = await getRemoteUrl(repoDir, remoteName);

  if (existingUrl) {
    const normalizedExisting = normalizeGitUrl(existingUrl);
    const normalizedNew = normalizeGitUrl(url);

    if (normalizedExisting === normalizedNew) {
      // Same URL (ignoring minor variations), nothing to do
      return;
    }

    // Different URL - refuse to overwrite for safety
    throw new Error(
      `Remote '${remoteName}' already exists with URL: ${existingUrl}\n` +
      `Cannot overwrite with: ${url}\n` +
      `To link a different repository, first unlink the current one.`
    );
  }

  // Remote doesn't exist, add it
  const { Command } = await import("@tauri-apps/plugin-shell");
  const command = Command.create("git", [
    "-C",
    repoDir,
    "remote",
    "add",
    remoteName,
    url,
  ]);
  const output = await command.execute();
  if (output.code !== 0) {
    throw new Error(output.stderr || "Failed to add remote");
  }
}

/**
 * Push to remote with upstream tracking (for initial push).
 * Does `git push -u origin <branch>`.
 *
 * @param repoDir - The repository directory path
 * @param remoteName - The remote name (default: "origin")
 * @throws Error if push fails
 */
export async function pushWithUpstream(
  repoDir: string,
  remoteName: string = "origin",
): Promise<void> {
  const { Command } = await import("@tauri-apps/plugin-shell");

  // Get current branch name
  const branchCmd = Command.create("git", [
    "-C",
    repoDir,
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);
  const branchOutput = await branchCmd.execute();
  if (branchOutput.code !== 0) {
    throw new Error(branchOutput.stderr || "Failed to get current branch");
  }
  const branch = branchOutput.stdout.trim();

  // Push with upstream
  const pushCmd = Command.create("git", [
    "-C",
    repoDir,
    "push",
    "-u",
    remoteName,
    branch,
  ]);
  const pushOutput = await pushCmd.execute();
  if (pushOutput.code !== 0) {
    throw new Error(pushOutput.stderr || "Failed to push to remote");
  }
}

/**
 * Remove a remote from a repository.
 *
 * @param repoDir - The repository directory path
 * @param remoteName - The remote name (default: "origin")
 * @throws Error if the operation fails
 */
export async function removeRemote(
  repoDir: string,
  remoteName: string = "origin",
): Promise<void> {
  // Dynamic import to avoid issues in non-Tauri environments (tests)
  const { Command } = await import("@tauri-apps/plugin-shell");

  const command = Command.create("git", [
    "-C",
    repoDir,
    "remote",
    "remove",
    remoteName,
  ]);
  const output = await command.execute();
  if (output.code !== 0) {
    throw new Error(output.stderr || "Failed to remove remote");
  }
}
