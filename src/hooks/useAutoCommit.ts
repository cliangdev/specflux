/**
 * useAutoCommit Hook
 *
 * Automatically commits file changes after a debounce period.
 * Watches for file system changes in the project directory and
 * queues commits when auto-sync is enabled.
 */

import { useEffect, useRef, useCallback } from "react";
import { watch, type UnwatchFn } from "@tauri-apps/plugin-fs";
import { autoCommitChanges, getGitStatus } from "../services/projectSync";

interface UseAutoCommitOptions {
  /** Project reference/slug */
  projectRef?: string;
  /** Path to the repository */
  repoPath?: string;
  /** Whether auto-commit is enabled */
  enabled?: boolean;
  /** Debounce delay in milliseconds (default: 5000) */
  debounceMs?: number;
  /** Callback when commit succeeds */
  onCommit?: (message: string) => void;
  /** Callback when commit fails */
  onError?: (error: string) => void;
}

/**
 * Auto-commit hook that watches for file changes and commits them
 */
export function useAutoCommit({
  projectRef,
  repoPath,
  enabled = true,
  debounceMs = 5000,
  onCommit,
  onError,
}: UseAutoCommitOptions) {
  const debounceTimerRef = useRef<number | null>(null);
  const unwatchRef = useRef<UnwatchFn | null>(null);
  const isCommittingRef = useRef(false);

  const commitChanges = useCallback(async () => {
    if (!projectRef || isCommittingRef.current) {
      return;
    }

    try {
      isCommittingRef.current = true;

      // Check if there are actually changes
      const status = await getGitStatus(projectRef);
      if (!status || !status.has_changes) {
        return;
      }

      // Generate commit message with timestamp
      const timestamp = new Date().toLocaleString();
      const message = `chore: auto-commit changes (${timestamp})`;

      // Commit changes
      const result = await autoCommitChanges(projectRef, message);

      if (result.success) {
        onCommit?.(message);
      } else {
        onError?.(result.error || "Failed to commit changes");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error during auto-commit";
      onError?.(errorMessage);
    } finally {
      isCommittingRef.current = false;
    }
  }, [projectRef, onCommit, onError]);

  const scheduleCommit = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Schedule new commit after debounce
    debounceTimerRef.current = window.setTimeout(() => {
      commitChanges();
    }, debounceMs);
  }, [commitChanges, debounceMs]);

  useEffect(() => {
    // Only watch if enabled and we have a repo path
    if (!enabled || !repoPath) {
      return;
    }

    // Watch for file changes
    const startWatching = async () => {
      try {
        // Watch the repository directory recursively
        const unwatch = await watch(
          repoPath,
          (event) => {
            // Ignore .git directory changes
            if (event.paths.some((path) => path.includes("/.git/"))) {
              return;
            }

            // Schedule a commit when files change
            scheduleCommit();
          },
          { recursive: true }
        );

        unwatchRef.current = unwatch;
      } catch (error) {
        console.error("Failed to start watching for file changes:", error);
        onError?.("Failed to start auto-commit watcher");
      }
    };

    startWatching();

    // Cleanup
    return () => {
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, repoPath, scheduleCommit, onError]);

  // Manual trigger for immediate commit
  const triggerCommit = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    commitChanges();
  }, [commitChanges]);

  return {
    /** Manually trigger a commit immediately */
    triggerCommit,
  };
}
