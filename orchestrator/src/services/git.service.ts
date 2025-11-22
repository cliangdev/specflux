import simpleGit, { SimpleGit, StatusResult, BranchSummary } from 'simple-git';
import path from 'path';
import { SPECFLUX_DIRS } from './filesystem.service';

export interface GitStatus {
  isClean: boolean;
  current: string | null;
  tracking: string | null;
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitCommitResult {
  commit: string;
  branch: string;
  summary: {
    changes: number;
    insertions: number;
    deletions: number;
  };
}

export interface GitBranchInfo {
  current: string;
  all: string[];
  branches: Record<string, { current: boolean; commit: string }>;
}

/**
 * Create a git instance for a repository
 */
export function createGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath);
}

/**
 * Initialize a new git repository
 */
export async function initRepo(repoPath: string): Promise<void> {
  const git = createGit(repoPath);
  await git.init();
}

/**
 * Clone a repository
 */
export async function cloneRepo(url: string, targetPath: string): Promise<void> {
  const git = simpleGit();
  await git.clone(url, targetPath);
}

/**
 * Check if a directory is a git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  const git = createGit(repoPath);
  return git.checkIsRepo();
}

/**
 * Get repository status
 */
export async function getStatus(repoPath: string): Promise<GitStatus> {
  const git = createGit(repoPath);
  const status: StatusResult = await git.status();

  return {
    isClean: status.isClean(),
    current: status.current,
    tracking: status.tracking,
    staged: status.staged,
    modified: status.modified,
    untracked: status.not_added,
    ahead: status.ahead,
    behind: status.behind,
  };
}

/**
 * Stage files for commit
 */
export async function addFiles(repoPath: string, files: string | string[]): Promise<void> {
  const git = createGit(repoPath);
  await git.add(files);
}

/**
 * Stage all changes
 */
export async function addAll(repoPath: string): Promise<void> {
  const git = createGit(repoPath);
  await git.add('.');
}

/**
 * Commit staged changes
 */
export async function commit(repoPath: string, message: string): Promise<GitCommitResult> {
  const git = createGit(repoPath);
  const result = await git.commit(message);

  return {
    commit: result.commit,
    branch: result.branch,
    summary: {
      changes: result.summary.changes,
      insertions: result.summary.insertions,
      deletions: result.summary.deletions,
    },
  };
}

/**
 * Push to remote
 */
export async function push(repoPath: string, remote = 'origin', branch?: string): Promise<void> {
  const git = createGit(repoPath);
  if (branch) {
    await git.push(remote, branch);
  } else {
    await git.push(remote);
  }
}

/**
 * Pull from remote
 */
export async function pull(repoPath: string, remote = 'origin', branch?: string): Promise<void> {
  const git = createGit(repoPath);
  if (branch) {
    await git.pull(remote, branch);
  } else {
    await git.pull(remote);
  }
}

/**
 * Fetch from remote
 */
export async function fetch(repoPath: string, remote = 'origin'): Promise<void> {
  const git = createGit(repoPath);
  await git.fetch(remote);
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string | null> {
  const git = createGit(repoPath);
  const status = await git.status();
  return status.current;
}

/**
 * Get all branches
 */
export async function getBranches(repoPath: string): Promise<GitBranchInfo> {
  const git = createGit(repoPath);
  const branches: BranchSummary = await git.branch();

  return {
    current: branches.current,
    all: branches.all,
    branches: Object.fromEntries(
      Object.entries(branches.branches).map(([name, info]) => [
        name,
        { current: info.current, commit: info.commit },
      ])
    ),
  };
}

/**
 * Create a new branch
 */
export async function createBranch(repoPath: string, branchName: string): Promise<void> {
  const git = createGit(repoPath);
  await git.checkoutLocalBranch(branchName);
}

/**
 * Checkout a branch
 */
export async function checkout(repoPath: string, branchName: string): Promise<void> {
  const git = createGit(repoPath);
  await git.checkout(branchName);
}

/**
 * Get commit log
 */
export async function getLog(
  repoPath: string,
  maxCount = 10
): Promise<Array<{ hash: string; date: string; message: string; author: string }>> {
  const git = createGit(repoPath);
  const log = await git.log({ maxCount });

  return log.all.map((entry) => ({
    hash: entry.hash,
    date: entry.date,
    message: entry.message,
    author: entry.author_name,
  }));
}

/**
 * Get diff of uncommitted changes
 */
export async function getDiff(repoPath: string, staged = false): Promise<string> {
  const git = createGit(repoPath);
  if (staged) {
    return git.diff(['--cached']);
  }
  return git.diff();
}

/**
 * Auto-commit changes in .specflux directory
 * Used for automatic syncing of orchestrator files
 */
export async function autoCommitSpecflux(
  projectPath: string,
  message?: string
): Promise<GitCommitResult | null> {
  const git = createGit(projectPath);
  const specfluxPath = path.join(projectPath, SPECFLUX_DIRS.ROOT);

  // Check if there are changes in .specflux
  const status = await git.status();
  const specfluxChanges = [
    ...status.modified,
    ...status.not_added,
    ...status.created,
    ...status.deleted,
  ].filter((file) => file.startsWith(SPECFLUX_DIRS.ROOT));

  if (specfluxChanges.length === 0) {
    return null; // No changes to commit
  }

  // Stage only .specflux changes
  await git.add(specfluxPath);

  // Commit with auto-generated or custom message
  const commitMessage = message ?? `[SpecFlux] Auto-sync orchestrator files`;
  const result = await git.commit(commitMessage);

  return {
    commit: result.commit,
    branch: result.branch,
    summary: {
      changes: result.summary.changes,
      insertions: result.summary.insertions,
      deletions: result.summary.deletions,
    },
  };
}

/**
 * Setup git config for a repository (user name and email)
 */
export async function configureRepo(repoPath: string, name: string, email: string): Promise<void> {
  const git = createGit(repoPath);
  await git.addConfig('user.name', name);
  await git.addConfig('user.email', email);
}

/**
 * Check if remote exists
 */
export async function hasRemote(repoPath: string, remoteName = 'origin'): Promise<boolean> {
  const git = createGit(repoPath);
  const remotes = await git.getRemotes();
  return remotes.some((r) => r.name === remoteName);
}

/**
 * Add a remote
 */
export async function addRemote(repoPath: string, remoteName: string, url: string): Promise<void> {
  const git = createGit(repoPath);
  await git.addRemote(remoteName, url);
}

/**
 * Get remote URL
 */
export async function getRemoteUrl(
  repoPath: string,
  remoteName = 'origin'
): Promise<string | null> {
  const git = createGit(repoPath);
  const remotes = await git.getRemotes(true);
  const remote = remotes.find((r) => r.name === remoteName);
  return remote?.refs.fetch ?? null;
}
