import { useState, useRef, useEffect } from "react";

// Inline SVG icons to avoid external dependencies
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export interface StatusOption {
  value: string;
  label: string;
}

export interface StatusBadgeProps {
  status: string;
  variant?: "default" | "dropdown";
  onChange?: (status: string) => void;
  options?: StatusOption[];
  size?: "sm" | "md";
}

// Status configuration with new design system colors
// Maps status values to their display properties
interface StatusConfig {
  label: string;
  icon: "dot" | "pulse" | "check";
  classes: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  // Gray statuses (Draft, Backlog, Planning, Ready)
  DRAFT: {
    label: "Draft",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  BACKLOG: {
    label: "Backlog",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  PLANNING: {
    label: "Planning",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  READY: {
    label: "Ready",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  // Blue status (In Progress) with pulsing dot
  IN_PROGRESS: {
    label: "In Progress",
    icon: "pulse",
    classes:
      "bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800/50",
  },
  // Amber status (In Review)
  IN_REVIEW: {
    label: "In Review",
    icon: "dot",
    classes:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
  },
  // Green statuses (Completed, Approved) with checkmark
  COMPLETED: {
    label: "Completed",
    icon: "check",
    classes:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  },
  APPROVED: {
    label: "Approved",
    icon: "check",
    classes:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  },
  IMPLEMENTED: {
    label: "Implemented",
    icon: "check",
    classes:
      "bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800/50",
  },
  // Red status (Blocked)
  BLOCKED: {
    label: "Blocked",
    icon: "dot",
    classes:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
  },
  // Gray statuses (Archived, Cancelled)
  ARCHIVED: {
    label: "Archived",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-500 border-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700",
  },
  // Release statuses
  PLANNED: {
    label: "Planned",
    icon: "dot",
    classes:
      "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
  },
  RELEASED: {
    label: "Released",
    icon: "check",
    classes:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
  },
};

// Get status config with fallback for unknown statuses
function getStatusConfig(status: string): StatusConfig {
  const upperStatus = status.toUpperCase().replace(/ /g, "_");
  return (
    STATUS_CONFIG[upperStatus] || {
      // For unknown statuses, just replace underscores with spaces
      label: status.replace(/_/g, " "),
      icon: "dot" as const,
      classes:
        "bg-surface-100 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
    }
  );
}

// Status indicator icon component
function StatusIndicator({ type }: { type: "dot" | "pulse" | "check" }) {
  if (type === "check") {
    return <CheckIcon className="w-3 h-3" />;
  }

  if (type === "pulse") {
    return (
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
      </span>
    );
  }

  // Default dot
  return <span className="w-1.5 h-1.5 rounded-full bg-current"></span>;
}

export function StatusBadge({
  status,
  variant = "default",
  onChange,
  options,
  size = "sm",
}: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = getStatusConfig(status);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  const badgeContent = (
    <>
      <StatusIndicator type={config.icon} />
      <span>{config.label}</span>
      {variant === "dropdown" && onChange && (
        <ChevronDownIcon className="w-3 h-3 ml-0.5 opacity-60" />
      )}
    </>
  );

  // Simple badge (non-interactive)
  if (variant === "default" || !onChange) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap ${sizeClasses} ${config.classes}`}
      >
        {badgeContent}
      </span>
    );
  }

  // Dropdown variant
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${sizeClasses} ${config.classes}`}
      >
        {badgeContent}
      </button>

      {isOpen && options && options.length > 0 && (
        <div className="absolute z-50 mt-1 min-w-[140px] bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 shadow-lg py-1">
          {options.map((option) => {
            const optionConfig = getStatusConfig(option.value);
            const isSelected =
              option.value.toUpperCase() === status.toUpperCase();

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors ${
                  isSelected
                    ? "bg-surface-50 dark:bg-surface-800"
                    : ""
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${optionConfig.classes}`}
                >
                  <StatusIndicator type={optionConfig.icon} />
                  {optionConfig.label}
                </span>
                {isSelected && (
                  <CheckIcon className="w-4 h-4 ml-auto text-accent-600 dark:text-accent-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export status config for use in other components
export { STATUS_CONFIG, getStatusConfig };
export type { StatusConfig };
