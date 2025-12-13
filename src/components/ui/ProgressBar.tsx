interface ProgressBarProps {
  percent: number;
  /** Size variant - defaults to 'sm' */
  size?: "sm" | "md" | "lg";
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Custom className for the container */
  className?: string;
}

const sizeClasses = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

export default function ProgressBar({
  percent,
  size = "sm",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const normalizedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 min-w-[60px] bg-surface-200 dark:bg-surface-700 rounded-full ${sizeClasses[size]}`}
      >
        <div
          className={`bg-accent-500 ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${normalizedPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-surface-500 dark:text-surface-400 tabular-nums">
          {normalizedPercent}%
        </span>
      )}
    </div>
  );
}
