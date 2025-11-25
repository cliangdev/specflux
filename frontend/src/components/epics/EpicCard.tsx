import { useNavigate } from "react-router-dom";
import type { Epic } from "../../api";
import { ProgressBar } from "../ui";

// Epic status badge configuration
const EPIC_STATUS_CONFIG: Record<
  string,
  { label: string; icon: JSX.Element; classes: string }
> = {
  planning: {
    label: "Planning",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
      </svg>
    ),
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  active: {
    label: "Active",
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800",
  },
  completed: {
    label: "Completed",
    icon: (
      <svg
        className="w-3.5 h-3.5"
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
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

interface EpicCardProps {
  epic: Epic;
}

export default function EpicCard({ epic }: EpicCardProps) {
  const navigate = useNavigate();
  const statusConfig =
    EPIC_STATUS_CONFIG[epic.status] || EPIC_STATUS_CONFIG.planning;
  const taskStats = epic.taskStats || { total: 0, done: 0, inProgress: 0 };
  const progressPercent = epic.progressPercentage ?? 0;

  const handleClick = () => {
    navigate(`/epics/${epic.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="card p-5 cursor-pointer hover:shadow-md dark:hover:bg-system-800/80 transition-all duration-200 flex flex-col"
    >
      {/* Header: ID and Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono text-system-500 dark:text-system-400">
          #{epic.id}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.classes}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-system-900 dark:text-white mb-2 line-clamp-1">
        {epic.title}
      </h3>

      {/* Description */}
      {epic.description && (
        <p className="text-sm text-system-500 dark:text-system-400 mb-4 line-clamp-2">
          {epic.description}
        </p>
      )}

      {/* Spacer to push content to bottom */}
      <div className="flex-1" />

      {/* Progress Bar */}
      <div className="mb-3">
        <ProgressBar percent={progressPercent} size="md" showLabel />
      </div>

      {/* Task Stats */}
      <div className="flex items-center gap-3 text-sm text-system-500 dark:text-system-400">
        <span>
          {taskStats.done ?? 0}/{taskStats.total ?? 0} tasks
        </span>
        {(taskStats.inProgress ?? 0) > 0 && (
          <>
            <span className="text-system-300 dark:text-system-600">|</span>
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-brand-500 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {taskStats.inProgress} in progress
            </span>
          </>
        )}
      </div>

      {/* PRD Link */}
      {epic.prdFilePath && (
        <div className="mt-3 pt-3 border-t border-system-200 dark:border-system-700">
          <span className="inline-flex items-center gap-1.5 text-xs text-system-500 dark:text-system-400">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            PRD
          </span>
        </div>
      )}
    </div>
  );
}
