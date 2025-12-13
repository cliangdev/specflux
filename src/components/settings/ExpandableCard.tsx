import { useState, type ReactNode } from "react";

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

/**
 * Expandable card component for settings sections.
 * Provides a consistent collapsible UI pattern.
 */
export function ExpandableCard({
  title,
  subtitle,
  defaultExpanded = true,
  children,
  icon,
  badge,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden bg-white dark:bg-surface-800">
      {/* Header - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-surface-500 dark:text-surface-400">{icon}</div>
          )}
          <div className="text-left">
            <h3 className="text-sm font-medium text-surface-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {badge}
        </div>
        <svg
          className={`w-5 h-5 text-surface-400 dark:text-surface-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - collapsible */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-surface-200 dark:border-surface-700">
          {children}
        </div>
      )}
    </div>
  );
}
