export type SyncStatus =
  | "local_only"
  | "synced"
  | "pending_push"
  | "pending_pull"
  | "conflict"
  | "offline";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  onClick?: () => void;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

// Icons as inline SVG components
const CheckCircleIcon = ({ className }: { className?: string }) => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloudArrowUpIcon = ({ className }: { className?: string }) => (
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
      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
    />
  </svg>
);

const CloudArrowDownIcon = ({ className }: { className?: string }) => (
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
      d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
    />
  </svg>
);

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

const WifiOffIcon = ({ className }: { className?: string }) => (
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
      d="M3 3l18 18M9.172 9.172a4 4 0 015.656 0M6.343 6.343a8 8 0 0111.314 0m-2.828 2.828a4 4 0 00-5.656 0m8.485 2.829A12 12 0 003 3m9 9v.01"
    />
  </svg>
);

const ComputerDesktopIcon = ({ className }: { className?: string }) => (
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
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
    />
  </svg>
);

// Status configuration
interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  classes: string;
  pulseClasses?: string;
}

const STATUS_CONFIG: Record<SyncStatus, StatusConfig> = {
  synced: {
    label: "Synced",
    icon: CheckCircleIcon,
    classes:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  },
  pending_push: {
    label: "Push Pending",
    icon: CloudArrowUpIcon,
    classes:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    pulseClasses: "bg-amber-500",
  },
  pending_pull: {
    label: "Pull Pending",
    icon: CloudArrowDownIcon,
    classes:
      "bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800/50",
    pulseClasses: "bg-accent-500",
  },
  conflict: {
    label: "Conflict",
    icon: ExclamationTriangleIcon,
    classes:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
  },
  offline: {
    label: "Offline",
    icon: WifiOffIcon,
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  local_only: {
    label: "Local Only",
    icon: ComputerDesktopIcon,
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
};

// Pulsing indicator for pending states
function PulseIndicator({ className }: { className: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${className}`}
      ></span>
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${className}`}
      ></span>
    </span>
  );
}

export function SyncStatusBadge({
  status,
  onClick,
  size = "sm",
  showLabel = false,
  className = "",
}: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: "px-2 py-0.5",
      icon: "w-3 h-3",
      text: "text-xs",
    },
    md: {
      container: "px-2.5 py-1",
      icon: "w-3.5 h-3.5",
      text: "text-sm",
    },
  };

  const sizes = sizeClasses[size];

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap ${sizes.container} ${config.classes} ${className}`}
    >
      {config.pulseClasses ? (
        <PulseIndicator className={config.pulseClasses} />
      ) : (
        <Icon className={sizes.icon} />
      )}
      {showLabel && <span className={sizes.text}>{config.label}</span>}
    </span>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900"
        title={`Sync Status: ${config.label}`}
      >
        {content}
      </button>
    );
  }

  return content;
}

// Export config for testing
export { STATUS_CONFIG };
