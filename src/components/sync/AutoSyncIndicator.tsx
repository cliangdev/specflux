/**
 * AutoSyncIndicator
 *
 * A subtle indicator for auto-sync status. Shows sync activity
 * without being intrusive - users shouldn't need to think about Git.
 *
 * Design philosophy: "Transparent Git" - the indicator is minimal
 * and only draws attention when there's something the user needs to know.
 */

import type { AutoSyncStatus } from "../../hooks/useAutoSync";

interface AutoSyncIndicatorProps {
  status: AutoSyncStatus;
  isOnline?: boolean;
  className?: string;
}

// Cloud icon for synced/syncing states
function CloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

// Sync arrows icon for active syncing
function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

// Warning icon for conflicts/errors
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

// Offline icon
function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
      />
    </svg>
  );
}

// Status configuration
interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  animate?: boolean;
  visible: boolean; // Whether to show the indicator at all
}

const STATUS_CONFIG: Record<AutoSyncStatus, StatusConfig> = {
  disabled: {
    icon: CloudIcon,
    label: "Sync disabled",
    color: "text-surface-400 dark:text-surface-600",
    visible: false, // Don't show when disabled
  },
  watching: {
    icon: CloudIcon,
    label: "Cloud sync enabled",
    color: "text-emerald-500 dark:text-emerald-400",
    visible: true, // Show subtle indicator that sync is active
  },
  pending: {
    icon: CloudIcon,
    label: "Changes pending...",
    color: "text-amber-500 dark:text-amber-400",
    visible: true,
  },
  committing: {
    icon: SyncIcon,
    label: "Saving changes...",
    color: "text-accent-500 dark:text-accent-400",
    animate: true,
    visible: true,
  },
  pushing: {
    icon: SyncIcon,
    label: "Syncing to cloud...",
    color: "text-accent-500 dark:text-accent-400",
    animate: true,
    visible: true,
  },
  pulling: {
    icon: SyncIcon,
    label: "Getting updates...",
    color: "text-accent-500 dark:text-accent-400",
    animate: true,
    visible: true,
  },
  synced: {
    icon: CloudIcon,
    label: "All changes synced",
    color: "text-emerald-500 dark:text-emerald-400",
    visible: true, // Show that everything is synced
  },
  offline: {
    icon: OfflineIcon,
    label: "Offline - changes saved locally",
    color: "text-surface-500 dark:text-surface-400",
    visible: true,
  },
  conflict: {
    icon: WarningIcon,
    label: "Sync conflict - click to resolve",
    color: "text-red-500 dark:text-red-400",
    visible: true,
  },
  error: {
    icon: WarningIcon,
    label: "Sync error",
    color: "text-red-500 dark:text-red-400",
    visible: true,
  },
};

export function AutoSyncIndicator({
  status,
  isOnline = true,
  className = "",
}: AutoSyncIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Don't render if this status shouldn't be visible
  if (!config.visible) {
    return null;
  }

  // Override for offline when we have pending changes
  const displayConfig = !isOnline && status !== "offline"
    ? STATUS_CONFIG.offline
    : config;
  const DisplayIcon = displayConfig.icon;

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      title={displayConfig.label}
    >
      <DisplayIcon
        className={`w-4 h-4 ${displayConfig.color} ${
          displayConfig.animate ? "animate-spin" : ""
        }`}
      />
      {/* Only show label for important states */}
      {(status === "conflict" || status === "error") && (
        <span className={`text-xs font-medium ${displayConfig.color}`}>
          {status === "conflict" ? "Conflict" : "Error"}
        </span>
      )}
    </div>
  );
}
