import { type HealthStatus } from "../../services/systemDeps";

interface ProjectHealthBadgeProps {
  status: HealthStatus;
  /** Whether the badge is clickable */
  onClick?: () => void;
  /** Size variant */
  size?: "sm" | "md";
  /** Show text label alongside indicator */
  showLabel?: boolean;
  /** Custom className */
  className?: string;
}

const statusConfig = {
  healthy: {
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Healthy",
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Warning",
  },
  error: {
    bg: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    label: "Setup Required",
  },
};

const sizeClasses = {
  sm: {
    dot: "w-2 h-2",
    text: "text-xs",
    padding: "px-1.5 py-0.5",
  },
  md: {
    dot: "w-2.5 h-2.5",
    text: "text-sm",
    padding: "px-2 py-1",
  },
};

export default function ProjectHealthBadge({
  status,
  onClick,
  size = "sm",
  showLabel = false,
  className = "",
}: ProjectHealthBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeClasses[size];

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 ${sizes.padding} ${className}`}
    >
      <span className={`${sizes.dot} rounded-full ${config.bg}`} />
      {showLabel && (
        <span className={`${sizes.text} font-medium ${config.text}`}>
          {config.label}
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="rounded-md hover:bg-system-100 dark:hover:bg-system-800 transition-colors"
        title={`Project Health: ${config.label}`}
      >
        {content}
      </button>
    );
  }

  return content;
}
