import { useNavigate } from "react-router-dom";
import type { TaskDependency } from "../../api";

// Status configuration for dependency items
const DEPENDENCY_STATUS_CONFIG: Record<
  string,
  { icon: JSX.Element; classes: string }
> = {
  backlog: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    classes: "text-slate-500 dark:text-slate-400",
  },
  ready: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    classes: "text-slate-500 dark:text-slate-400",
  },
  in_progress: {
    icon: (
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    classes: "text-brand-500 dark:text-brand-400",
  },
  pending_review: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes: "text-amber-500 dark:text-amber-400",
  },
  approved: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes: "text-emerald-500 dark:text-emerald-400",
  },
  done: {
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes: "text-emerald-500 dark:text-emerald-400",
  },
};

// Status badge configuration
const STATUS_BADGE_CONFIG: Record<string, { label: string; classes: string }> =
  {
    backlog: {
      label: "Backlog",
      classes:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    ready: {
      label: "Ready",
      classes:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    in_progress: {
      label: "In Progress",
      classes:
        "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
    },
    pending_review: {
      label: "Review",
      classes:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    approved: {
      label: "Approved",
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    done: {
      label: "Done",
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
  };

interface DependencyListProps {
  dependencies: TaskDependency[];
  onRemove?: (dependencyId: number) => void;
  showRemoveButton?: boolean;
  emptyMessage?: string;
}

export default function DependencyList({
  dependencies,
  onRemove,
  showRemoveButton = true,
  emptyMessage = "No dependencies",
}: DependencyListProps) {
  const navigate = useNavigate();

  if (dependencies.length === 0) {
    return (
      <div className="text-sm text-system-500 dark:text-system-400 py-2">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dependencies.map((dep) => {
        const task = dep.dependsOnTask;
        if (!task) return null;

        const statusConfig =
          DEPENDENCY_STATUS_CONFIG[task.status] ||
          DEPENDENCY_STATUS_CONFIG.backlog;
        const badgeConfig =
          STATUS_BADGE_CONFIG[task.status] || STATUS_BADGE_CONFIG.backlog;
        const isComplete = task.status === "approved" || task.status === "done";

        return (
          <div
            key={dep.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-system-50 dark:bg-system-800/50 hover:bg-system-100 dark:hover:bg-system-800 transition-colors group"
          >
            {/* Status Icon */}
            <span className={statusConfig.classes}>{statusConfig.icon}</span>

            {/* Task ID and Title - Clickable */}
            <button
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-xs font-mono text-system-500 dark:text-system-400">
                #{task.id}
              </span>
              <span
                className={`text-sm truncate ${
                  isComplete
                    ? "text-system-500 dark:text-system-400 line-through"
                    : "text-system-700 dark:text-system-200"
                }`}
              >
                {task.title}
              </span>
            </button>

            {/* Status Badge */}
            <span
              className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${badgeConfig.classes}`}
            >
              {badgeConfig.label}
            </span>

            {/* Remove Button */}
            {showRemoveButton && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(dep.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-system-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                title="Remove dependency"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
