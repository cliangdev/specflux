/**
 * useAutoSync Hook
 *
 * Enhanced auto-sync hook that provides transparent Git synchronization.
 * Uses native file watching for efficient change detection.
 *
 * Features:
 * - Watches project directory for file changes
 * - Auto-commits after debounce period (5 seconds)
 * - Auto-pushes to remote after commit (if online)
 * - Pulls from remote on window focus
 * - Handles offline mode gracefully (queues changes)
 * - Provides sync status updates
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { watch, type UnwatchFn } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import {
  autoCommit,
  pushChanges,
  pullChanges,
  fetchRemote,
  getGitStatus,
} from "../services/gitOperations";

export type AutoSyncStatus =
  | "disabled"      // Auto-sync is disabled
  | "watching"      // Watching for changes, all synced
  | "pending"       // Changes detected, waiting for debounce
  | "committing"    // Auto-commit in progress
  | "pushing"       // Push in progress
  | "pulling"       // Pull in progress
  | "synced"        // All changes synced
  | "offline"       // Offline, changes queued locally
  | "conflict"      // Merge conflict detected
  | "error";        // Error occurred

interface UseAutoSyncOptions {
  /** Path to the repository */
  repoPath?: string;
  /** Whether auto-sync is enabled */
  enabled?: boolean;
  /** Debounce delay in milliseconds (default: 30000 = 30 seconds) */
  debounceMs?: number;
  /** Whether to pull on window focus (default: true) */
  pullOnFocus?: boolean;
  /** Callback when sync status changes */
  onStatusChange?: (status: AutoSyncStatus) => void;
  /** Callback when sync succeeds */
  onSync?: (action: "commit" | "push" | "pull") => void;
  /** Callback when sync fails */
  onError?: (error: string, action: "commit" | "push" | "pull") => void;
  /** Callback when conflict is detected */
  onConflict?: () => void;
}

interface UseAutoSyncReturn {
  /** Current sync status */
  status: AutoSyncStatus;
  /** Number of pending changes */
  pendingChanges: number;
  /** Whether currently online */
  isOnline: boolean;
  /** Last sync timestamp */
  lastSyncedAt: Date | null;
  /** Manually trigger sync (commit + push) */
  triggerSync: () => Promise<void>;
  /** Manually trigger pull */
  triggerPull: () => Promise<void>;
}

/**
 * Check if we can reach GitHub (simple online check)
 */
async function checkOnlineStatus(): Promise<boolean> {
  try {
    // Try to fetch from a known endpoint with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch("https://api.github.com/zen", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if repository has a remote configured
 */
async function hasRemote(repoPath: string): Promise<boolean> {
  try {
    const command = Command.create("git", ["-C", repoPath, "remote", "get-url", "origin"]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if local is ahead of remote (has commits to push)
 */
async function hasUnpushedCommits(repoPath: string): Promise<boolean> {
  try {
    const command = Command.create("git", [
      "-C",
      repoPath,
      "rev-list",
      "HEAD",
      "--not",
      "--remotes",
      "--count",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      const count = parseInt(output.stdout.trim(), 10);
      return count > 0;
    }
  } catch {
    // Error checking - assume no unpushed commits
  }
  return false;
}

/**
 * Check if remote has commits we don't have
 */
async function hasRemoteChanges(repoPath: string): Promise<boolean> {
  try {
    // First fetch to update remote refs
    await fetchRemote(repoPath);

    // Check if we're behind
    const branchCmd = Command.create("git", [
      "-C",
      repoPath,
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    const branchOutput = await branchCmd.execute();
    if (branchOutput.code !== 0) return false;

    const branch = branchOutput.stdout.trim();

    const behindCmd = Command.create("git", [
      "-C",
      repoPath,
      "rev-list",
      `HEAD..origin/${branch}`,
      "--count",
    ]);
    const behindOutput = await behindCmd.execute();
    if (behindOutput.code === 0) {
      const count = parseInt(behindOutput.stdout.trim(), 10);
      return count > 0;
    }
  } catch {
    // Error checking - assume no remote changes
  }
  return false;
}

/**
 * Auto-sync hook for transparent Git synchronization
 */
export function useAutoSync({
  repoPath,
  enabled = true,
  debounceMs = 30000,
  pullOnFocus = true,
  onStatusChange,
  onSync,
  onError,
  onConflict,
}: UseAutoSyncOptions): UseAutoSyncReturn {
  const [status, setStatus] = useState<AutoSyncStatus>("disabled");
  const [pendingChanges, setPendingChanges] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasRemoteConfigured, setHasRemoteConfigured] = useState(false);

  const debounceTimerRef = useRef<number | null>(null);
  const unwatchRef = useRef<UnwatchFn | null>(null);
  const isSyncingRef = useRef(false);
  const lastPullAttemptRef = useRef<number>(0);
  const performSyncRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const onErrorRef = useRef(onError);
  // Will be initialized after updateStatus is defined
  const updateStatusRef = useRef<(status: AutoSyncStatus) => void>(null!);

  // Minimum time between pull attempts (60 seconds)
  const PULL_COOLDOWN_MS = 60000;

  // Update status and notify
  const updateStatus = useCallback((newStatus: AutoSyncStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Initialize ref synchronously (will be kept up to date by the effect)
  if (updateStatusRef.current === null) {
    updateStatusRef.current = updateStatus;
  }

  // Check online status periodically
  useEffect(() => {
    const checkOnline = async () => {
      const online = await checkOnlineStatus();
      setIsOnline(online);
    };

    checkOnline();
    const interval = setInterval(checkOnline, 30000); // Check every 30 seconds

    // Also check on network status change
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check if repo has remote configured (GitHub linked)
  useEffect(() => {
    if (!repoPath) {
      setHasRemoteConfigured(false);
      return;
    }

    hasRemote(repoPath).then((has) => {
      setHasRemoteConfigured(has);
    });
  }, [repoPath]);

  // Auto-commit and push
  const performSync = useCallback(async () => {
    if (!repoPath || isSyncingRef.current) {
      return;
    }

    try {
      isSyncingRef.current = true;

      // Check if there are changes to commit
      const gitStatus = await getGitStatus(repoPath);

      if (!gitStatus || !gitStatus.hasChanges) {
        // No local changes - check if we need to push unpushed commits
        if (hasRemoteConfigured && isOnline) {
          const hasUnpushed = await hasUnpushedCommits(repoPath);
          if (hasUnpushed) {
            updateStatus("pushing");
            await pushChanges(repoPath);
            setLastSyncedAt(new Date());
            onSync?.("push");
          }
        }
        updateStatus("synced");
        setPendingChanges(0);
        return;
      }

      // Commit changes
      updateStatus("committing");
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const message = `Auto-save: ${timestamp}`;

      await autoCommit(repoPath, message);
      onSync?.("commit");
      setPendingChanges(0);

      // Push if online and has remote
      if (hasRemoteConfigured && isOnline) {
        updateStatus("pushing");
        try {
          await pushChanges(repoPath);
          setLastSyncedAt(new Date());
          onSync?.("push");
          updateStatus("synced");
        } catch (pushError) {
          // Push failed - might be conflict or network issue
          const errorMsg = pushError instanceof Error ? pushError.message : String(pushError);

          if (errorMsg.includes("conflict") || errorMsg.includes("rejected")) {
            updateStatus("conflict");
            onConflict?.();
            onError?.(errorMsg, "push");
          } else {
            // Network or other error - stay in offline mode
            updateStatus("offline");
            onError?.(errorMsg, "push");
          }
          return;
        }
      } else if (!isOnline) {
        updateStatus("offline");
      } else {
        updateStatus("synced");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error during sync";
      console.error("[AutoSync] Error:", errorMsg);
      updateStatus("error");
      onError?.(errorMsg, "commit");
    } finally {
      isSyncingRef.current = false;
    }
  }, [repoPath, isOnline, hasRemoteConfigured, updateStatus, onSync, onError, onConflict]);

  // Keep refs updated with latest functions
  useEffect(() => {
    performSyncRef.current = performSync;
    onErrorRef.current = onError;
    updateStatusRef.current = updateStatus;
  }, [performSync, onError, updateStatus]);

  // Schedule sync after debounce (used by triggerSync, file watcher uses inline version)
  const scheduleSync = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    updateStatus("pending");
    setPendingChanges((prev) => prev + 1);

    debounceTimerRef.current = window.setTimeout(() => {
      performSync();
    }, debounceMs);
  }, [performSync, debounceMs, updateStatus]);

  // Pull from remote (with cooldown to prevent excessive network calls)
  const triggerPull = useCallback(async () => {
    if (!repoPath || !hasRemoteConfigured || isSyncingRef.current) {
      return;
    }

    // Check cooldown - don't pull too frequently
    const now = Date.now();
    if (now - lastPullAttemptRef.current < PULL_COOLDOWN_MS) {
      return;
    }
    lastPullAttemptRef.current = now;

    try {
      isSyncingRef.current = true;

      // Check if remote has changes (does a fetch)
      const hasChanges = await hasRemoteChanges(repoPath);
      if (!hasChanges) {
        return;
      }

      updateStatus("pulling");
      await pullChanges(repoPath);
      setLastSyncedAt(new Date());
      onSync?.("pull");
      updateStatus("synced");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("conflict")) {
        updateStatus("conflict");
        onConflict?.();
        onError?.(errorMsg, "pull");
      } else {
        onError?.(errorMsg, "pull");
        updateStatus("error");
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [repoPath, updateStatus, onSync, onError, onConflict]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    await performSync();
  }, [performSync]);

  // File watcher effect - watch for file changes
  // IMPORTANT: Only use stable dependencies (enabled, repoPath, debounceMs)
  // Use refs for callbacks to avoid effect re-runs when callbacks change
  useEffect(() => {
    // Only enable auto-sync if enabled, has local path, AND has remote (GitHub linked)
    if (!enabled || !repoPath || !hasRemoteConfigured) {
      updateStatusRef.current("disabled");
      return;
    }

    updateStatusRef.current("watching");

    // Start watching for file changes
    const startWatching = async () => {
      try {
        const unwatch = await watch(
          repoPath,
          (event) => {
            // Ignore .git directory changes
            if (event.paths.some((path) => path.includes("/.git/"))) {
              return;
            }

            // Schedule sync when files change (inline debounce to avoid stale closure)
            setPendingChanges((prev) => prev + 1);
            updateStatusRef.current("pending");

            // Clear existing timer and set new one (debounce)
            if (debounceTimerRef.current) {
              window.clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = window.setTimeout(() => {
              performSyncRef.current();
            }, debounceMs);
          },
          { recursive: true }
        );

        unwatchRef.current = unwatch;
      } catch (error) {
        console.error("[AutoSync] Failed to start file watcher:", error);
        updateStatusRef.current("error");
        onErrorRef.current?.("Failed to start file watcher", "commit");
      }
    };

    startWatching();

    // Cleanup - only clean up the watcher, NOT the timer
    return () => {
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
    };
  }, [enabled, repoPath, debounceMs, hasRemoteConfigured]); // Only stable dependencies - callbacks via refs

  // Pull on window focus
  useEffect(() => {
    if (!pullOnFocus || !enabled || !repoPath) return;

    const handleFocus = () => {
      // Only pull if online and not currently syncing
      if (isOnline && hasRemoteConfigured) {
        triggerPull();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [pullOnFocus, enabled, repoPath, isOnline, triggerPull]);

  // Initial pull check - only when remote is confirmed
  useEffect(() => {
    if (!enabled || !repoPath || !isOnline || !hasRemoteConfigured) return;

    // Pull remote changes on mount
    triggerPull();
  }, [enabled, repoPath, isOnline, hasRemoteConfigured, triggerPull]);

  return {
    status,
    pendingChanges,
    isOnline,
    lastSyncedAt,
    triggerSync,
    triggerPull,
  };
}
