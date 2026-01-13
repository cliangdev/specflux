/**
 * AutoSyncContext
 *
 * Provides auto-sync state and controls across the application.
 * This context wraps useAutoSync and makes it available to all components.
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useAutoSync, type AutoSyncStatus } from "../hooks/useAutoSync";
import { useProject } from "./ProjectContext";

interface AutoSyncContextValue {
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

const AutoSyncContext = createContext<AutoSyncContextValue | null>(null);

interface AutoSyncProviderProps {
  children: ReactNode;
}

export function AutoSyncProvider({ children }: AutoSyncProviderProps) {
  const { currentProject } = useProject();

  const syncState = useAutoSync({
    repoPath: currentProject?.localPath,
    enabled: !!currentProject?.localPath,
    debounceMs: 30000, // 30 seconds - commits after 30s of no changes
    pullOnFocus: true,
    onError: (error, action) => {
      console.error(`[AutoSync] ${action} failed:`, error);
    },
    onConflict: () => {
      console.warn("[AutoSync] Conflict detected - manual resolution required");
    },
  });

  return (
    <AutoSyncContext.Provider value={syncState}>
      {children}
    </AutoSyncContext.Provider>
  );
}

export function useAutoSyncContext(): AutoSyncContextValue {
  const context = useContext(AutoSyncContext);
  if (!context) {
    throw new Error("useAutoSyncContext must be used within an AutoSyncProvider");
  }
  return context;
}

/**
 * Hook that returns null if outside provider (safe to use anywhere)
 */
export function useAutoSyncContextSafe(): AutoSyncContextValue | null {
  return useContext(AutoSyncContext);
}
