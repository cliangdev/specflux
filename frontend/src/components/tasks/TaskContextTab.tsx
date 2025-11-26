import { Link } from "react-router-dom";
import type { Task, Epic, TaskDependency } from "../../api/generated";

interface TaskContextTabProps {
  task: Task;
  dependencies: TaskDependency[];
  epic?: Epic | null;
  onAddDependency?: () => void;
  onRemoveDependency?: (id: number) => void;
}

// Status badge for dependency tasks
function DependencyStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    done: {
      label: "Done",
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    approved: {
      label: "Approved",
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
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
    backlog: {
      label: "Backlog",
      classes:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    },
    ready: {
      label: "Ready",
      classes:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    },
  };

  const statusConfig = config[status] || config.backlog;

  return (
    <span
      className={`px-1.5 py-0.5 text-xs font-medium rounded ${statusConfig.classes}`}
    >
      {statusConfig.label}
    </span>
  );
}

export default function TaskContextTab({
  task,
  dependencies,
  epic,
  onAddDependency,
  onRemoveDependency,
}: TaskContextTabProps) {
  const completedDeps = dependencies.filter(
    (d) =>
      d.dependsOnTask?.status === "done" ||
      d.dependsOnTask?.status === "approved",
  );
  const blockedByCount = dependencies.length - completedDeps.length;

  return (
    <div className="space-y-6">
      {/* Dependencies Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-system-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-4 h-4 text-system-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Dependencies
            {blockedByCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                {blockedByCount} blocking
              </span>
            )}
          </h3>
          {onAddDependency && (
            <button
              onClick={onAddDependency}
              className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
            >
              + Add
            </button>
          )}
        </div>

        {dependencies.length > 0 ? (
          <div className="space-y-2">
            {dependencies.map((dep) => {
              const depTask = dep.dependsOnTask;
              const isCompleted =
                depTask?.status === "done" || depTask?.status === "approved";
              return (
                <div
                  key={dep.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isCompleted ? (
                      <svg
                        className="w-5 h-5 text-emerald-500 flex-shrink-0"
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
                    ) : (
                      <svg
                        className="w-5 h-5 text-amber-500 flex-shrink-0"
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
                    )}
                    <div className="min-w-0">
                      <Link
                        to={`/tasks/${dep.dependsOnTaskId}`}
                        className="text-sm font-medium text-system-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 truncate block"
                      >
                        #{dep.dependsOnTaskId}:{" "}
                        {depTask?.title || "Unknown Task"}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DependencyStatusBadge
                      status={depTask?.status || "backlog"}
                    />
                    {onRemoveDependency && (
                      <button
                        onClick={() => onRemoveDependency(dep.id)}
                        className="p-1 text-system-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-system-500 dark:text-system-400 italic">
            No dependencies - this task can start anytime
          </p>
        )}
      </div>

      {/* Epic Context Section */}
      <div>
        <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Epic Context
        </h3>
        {epic ? (
          <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <Link
              to={`/epics/${epic.id}`}
              className="text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200"
            >
              {epic.title}
            </Link>
            {epic.description && (
              <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 line-clamp-3">
                {epic.description}
              </p>
            )}
            <div className="mt-3 text-xs text-purple-500 dark:text-purple-400">
              <span>Status: {epic.status}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-system-500 dark:text-system-400 italic">
            Not assigned to an epic
          </p>
        )}
      </div>

      {/* Chain Outputs Section (placeholder for future) */}
      <div>
        <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-system-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          Chain Outputs
        </h3>
        <p className="text-sm text-system-500 dark:text-system-400 italic">
          No chain outputs from upstream tasks
        </p>
      </div>
    </div>
  );
}
