import { useState, useEffect, useCallback } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import type { SyncStatus } from "../components/sync/SyncStatusBadge";

interface SyncStatusData {
  status: SyncStatus;
  lastSyncedAt?: Date;
  pendingChanges: number;
  githubUrl?: string;
  branch?: string;
}

interface UseSyncStatusOptions {
  repoPath?: string;
  pollInterval?: number; // milliseconds, default 30000 (30 seconds)
  pollOnWindowFocus?: boolean;
}

interface UseSyncStatusReturn {
  syncData: SyncStatusData;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
}

/**
 * Check if directory has a git repository
 */
async function isGitRepo(path: string): Promise<boolean> {
  try {
    const command = Command.create("git", ["-C", path, "rev-parse", "--git-dir"]);
    const output = await command.execute();
    return output.code === 0;
  } catch {
    return false;
  }
}

/**
 * Get the remote URL of the repository
 */
async function getRemoteUrl(path: string): Promise<string | undefined> {
  try {
    const command = Command.create("git", ["-C", path, "remote", "get-url", "origin"]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim();
    }
  } catch {
    // No remote configured
  }
  return undefined;
}

/**
 * Get current branch name
 */
async function getCurrentBranch(path: string): Promise<string | undefined> {
  try {
    const command = Command.create("git", [
      "-C",
      path,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim();
    }
  } catch {
    // Error getting branch
  }
  return undefined;
}

/**
 * Check if there are uncommitted changes
 */
async function hasUncommittedChanges(path: string): Promise<number> {
  try {
    const command = Command.create("git", ["-C", path, "status", "--porcelain"]);
    const output = await command.execute();
    if (output.code === 0) {
      const lines = output.stdout.trim().split("\n").filter(Boolean);
      return lines.length;
    }
  } catch {
    // Error checking status
  }
  return 0;
}

/**
 * Check if local is ahead of remote (needs push)
 */
async function isAheadOfRemote(path: string, branch: string): Promise<boolean> {
  try {
    const command = Command.create("git", [
      "-C",
      path,
      "rev-list",
      `origin/${branch}..HEAD`,
      "--count",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      const count = parseInt(output.stdout.trim(), 10);
      return count > 0;
    }
  } catch {
    // Error or no remote tracking
  }
  return false;
}

/**
 * Check if remote is ahead of local (needs pull)
 */
async function isBehindRemote(path: string, branch: string): Promise<boolean> {
  try {
    const command = Command.create("git", [
      "-C",
      path,
      "rev-list",
      `HEAD..origin/${branch}`,
      "--count",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      const count = parseInt(output.stdout.trim(), 10);
      return count > 0;
    }
  } catch {
    // Error or no remote tracking
  }
  return false;
}

/**
 * Check if there are merge conflicts
 */
async function hasConflicts(path: string): Promise<boolean> {
  try {
    const command = Command.create("git", ["-C", path, "diff", "--name-only", "--diff-filter=U"]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim().length > 0;
    }
  } catch {
    // Error checking conflicts
  }
  return false;
}

/**
 * Fetch from remote to update tracking branches
 */
async function fetchRemote(path: string): Promise<void> {
  try {
    const command = Command.create("git", ["-C", path, "fetch", "origin"]);
    await command.execute();
  } catch {
    // Fetch failed - might be offline
  }
}

/**
 * Get last commit timestamp as approximation of last sync
 */
async function getLastCommitTime(path: string): Promise<Date | undefined> {
  try {
    const command = Command.create("git", [
      "-C",
      path,
      "log",
      "-1",
      "--format=%ct",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      const timestamp = parseInt(output.stdout.trim(), 10);
      if (!isNaN(timestamp)) {
        return new Date(timestamp * 1000);
      }
    }
  } catch {
    // Error getting last commit
  }
  return undefined;
}

/**
 * Determine sync status based on git state
 */
async function determineSyncStatus(path: string): Promise<SyncStatusData> {
  // Check if git repo exists
  const hasGit = await isGitRepo(path);
  if (!hasGit) {
    return {
      status: "local_only",
      pendingChanges: 0,
    };
  }

  // Get remote URL and branch
  const remoteUrl = await getRemoteUrl(path);
  const branch = await getCurrentBranch(path);

  // No remote configured
  if (!remoteUrl) {
    const pendingChanges = await hasUncommittedChanges(path);
    return {
      status: "local_only",
      pendingChanges,
    };
  }

  // Try to fetch - if this fails, we're likely offline
  const fetchFailed = await (async () => {
    try {
      await fetchRemote(path);
      return false;
    } catch {
      return true;
    }
  })();

  const pendingChanges = await hasUncommittedChanges(path);
  const lastSyncedAt = await getLastCommitTime(path);

  if (fetchFailed) {
    return {
      status: "offline",
      pendingChanges,
      githubUrl: remoteUrl,
      branch,
      lastSyncedAt,
    };
  }

  // Check for conflicts
  const conflicts = await hasConflicts(path);
  if (conflicts) {
    return {
      status: "conflict",
      pendingChanges,
      githubUrl: remoteUrl,
      branch,
      lastSyncedAt,
    };
  }

  if (!branch) {
    return {
      status: "local_only",
      pendingChanges,
      githubUrl: remoteUrl,
    };
  }

  // Check ahead/behind status
  const isAhead = await isAheadOfRemote(path, branch);
  const isBehind = await isBehindRemote(path, branch);

  // Both ahead and behind = diverged (conflict)
  if (isAhead && isBehind) {
    return {
      status: "conflict",
      pendingChanges,
      githubUrl: remoteUrl,
      branch,
      lastSyncedAt,
    };
  }

  // Local is ahead = need to push
  if (isAhead || pendingChanges > 0) {
    return {
      status: "pending_push",
      pendingChanges,
      githubUrl: remoteUrl,
      branch,
      lastSyncedAt,
    };
  }

  // Remote is ahead = need to pull
  if (isBehind) {
    return {
      status: "pending_pull",
      pendingChanges: 0,
      githubUrl: remoteUrl,
      branch,
      lastSyncedAt,
    };
  }

  // All synced
  return {
    status: "synced",
    pendingChanges: 0,
    githubUrl: remoteUrl,
    branch,
    lastSyncedAt,
  };
}

/**
 * Hook to monitor git sync status
 */
export function useSyncStatus({
  repoPath,
  pollInterval = 30000,
  pollOnWindowFocus = true,
}: UseSyncStatusOptions = {}): UseSyncStatusReturn {
  const [syncData, setSyncData] = useState<SyncStatusData>({
    status: "local_only",
    pendingChanges: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repoPath) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await determineSyncStatus(repoPath);
      setSyncData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check sync status");
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  // Push changes
  const push = useCallback(async () => {
    if (!repoPath || !syncData.branch) {
      throw new Error("No repository or branch configured");
    }

    const command = Command.create("git", [
      "-C",
      repoPath,
      "push",
      "origin",
      syncData.branch,
    ]);
    const output = await command.execute();
    if (output.code !== 0) {
      throw new Error(output.stderr || "Failed to push");
    }

    await refresh();
  }, [repoPath, syncData.branch, refresh]);

  // Pull changes
  const pull = useCallback(async () => {
    if (!repoPath || !syncData.branch) {
      throw new Error("No repository or branch configured");
    }

    const command = Command.create("git", [
      "-C",
      repoPath,
      "pull",
      "origin",
      syncData.branch,
    ]);
    const output = await command.execute();
    if (output.code !== 0) {
      throw new Error(output.stderr || "Failed to pull");
    }

    await refresh();
  }, [repoPath, syncData.branch, refresh]);

  // Smart sync: push if ahead, pull if behind
  const sync = useCallback(async () => {
    if (syncData.status === "pending_push") {
      await push();
    } else if (syncData.status === "pending_pull") {
      await pull();
    } else if (syncData.status === "conflict") {
      throw new Error("Cannot sync: conflicts need to be resolved first");
    }
  }, [syncData.status, push, pull]);

  // Initial load and polling
  useEffect(() => {
    refresh();

    if (pollInterval > 0) {
      const interval = setInterval(refresh, pollInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, pollInterval]);

  // Poll on window focus
  useEffect(() => {
    if (!pollOnWindowFocus) return;

    const handleFocus = () => {
      refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh, pollOnWindowFocus]);

  return {
    syncData,
    isLoading,
    error,
    refresh,
    sync,
    push,
    pull,
  };
}
