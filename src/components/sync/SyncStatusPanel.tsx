import { useState } from "react";
import { SyncStatusBadge, type SyncStatus } from "./SyncStatusBadge";

interface SyncStatusPanelProps {
  status: SyncStatus;
  lastSyncedAt?: Date;
  pendingChanges?: number;
  githubUrl?: string;
  onSync?: () => Promise<void>;
  onOpenConflictResolution?: () => void;
  className?: string;
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Status descriptions
const STATUS_DESCRIPTIONS: Record<SyncStatus, string> = {
  synced: "All changes are synchronized with GitHub",
  pending_push: "You have local commits that need to be pushed",
  pending_pull: "Remote has new commits that need to be pulled",
  conflict: "Local and remote changes conflict - resolution needed",
  offline: "No internet connection - changes queued",
  local_only: "This project is not connected to GitHub",
};

// Sync icon
const ArrowPathIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

// External link icon
const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

// Exclamation triangle icon
const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

export function SyncStatusPanel({
  status,
  lastSyncedAt,
  pendingChanges = 0,
  githubUrl,
  onSync,
  onOpenConflictResolution,
  className = "",
}: SyncStatusPanelProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync || syncing) return;

    try {
      setSyncing(true);
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const canSync = status !== "local_only" && status !== "offline";
  const showConflictButton = status === "conflict" && onOpenConflictResolution;

  return (
    <div
      className={`p-4 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
          Sync Status
        </h3>
        <SyncStatusBadge status={status} showLabel size="md" />
      </div>

      {/* Description */}
      <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {STATUS_DESCRIPTIONS[status]}
      </p>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* Last synced */}
        {lastSyncedAt && status !== "local_only" && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 dark:text-surface-400">
              Last synced:
            </span>
            <span className="text-surface-700 dark:text-surface-300 font-medium">
              {formatRelativeTime(lastSyncedAt)}
            </span>
          </div>
        )}

        {/* Pending changes */}
        {pendingChanges > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 dark:text-surface-400">
              Pending changes:
            </span>
            <span className="text-surface-700 dark:text-surface-300 font-medium">
              {pendingChanges} {pendingChanges === 1 ? "file" : "files"}
            </span>
          </div>
        )}

        {/* GitHub link */}
        {githubUrl && (
          <div className="pt-2 border-t border-surface-200 dark:border-surface-800">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLinkIcon className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {showConflictButton ? (
          <button
            onClick={onOpenConflictResolution}
            className="flex-1 btn btn-danger text-sm"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            Resolve Conflicts
          </button>
        ) : canSync && onSync ? (
          <button
            onClick={handleSync}
            disabled={syncing || status === "synced"}
            className="flex-1 btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                Sync Now
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* Offline notice */}
      {status === "offline" && (
        <div className="mt-3 p-2 bg-surface-50 dark:bg-surface-800 rounded border border-surface-200 dark:border-surface-700">
          <p className="text-xs text-surface-600 dark:text-surface-400">
            Changes will be synced automatically when connection is restored.
          </p>
        </div>
      )}
    </div>
  );
}
