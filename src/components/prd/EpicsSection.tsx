import { Link } from "react-router-dom";
import { StatusBadge } from "../ui/StatusBadge";
import type { Epic } from "../../api";

interface EpicsSectionProps {
  epics: Epic[];
  onAddEpic?: () => void;
  loading?: boolean;
}

export function EpicsSection({ epics, onAddEpic, loading }: EpicsSectionProps) {
  if (loading) {
    return (
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
            Epics
          </h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  // Don't render section if no epics and no onAddEpic handler
  if (epics.length === 0 && !onAddEpic) {
    return null;
  }

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
          Epics ({epics.length})
        </h3>
        {onAddEpic && (
          <button
            onClick={onAddEpic}
            className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
          >
            + Add
          </button>
        )}
      </div>

      {/* Content */}
      {epics.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-surface-500 dark:text-surface-400">
            No epics linked to this PRD
          </p>
          {onAddEpic && (
            <button
              onClick={onAddEpic}
              className="mt-2 text-sm text-accent-600 dark:text-accent-400 hover:underline"
            >
              Create first epic
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-surface-200 dark:divide-surface-700">
          {epics.map((epic) => (
            <EpicRow key={epic.id} epic={epic} />
          ))}
        </div>
      )}
    </div>
  );
}

function EpicRow({ epic }: { epic: Epic }) {
  const taskStats = epic.taskStats;
  // Use progressPercentage if available, otherwise calculate from taskStats
  const progress = epic.progressPercentage ??
    (taskStats && taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0);

  return (
    <Link
      to={`/epics/${encodeURIComponent(epic.id)}`}
      className="block px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
    >
      {/* Epic key and status */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-mono text-surface-400 dark:text-surface-500">
          {epic.displayKey}
        </span>
        <StatusBadge status={epic.status} size="sm" />
      </div>

      {/* Task count */}
      {taskStats && (
        <div className="text-xs text-surface-500 dark:text-surface-400 mb-2">
          {taskStats.done}/{taskStats.total} tasks
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress === 100
                ? "bg-emerald-500"
                : progress > 0
                  ? "bg-accent-500"
                  : "bg-surface-300 dark:bg-surface-600"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
