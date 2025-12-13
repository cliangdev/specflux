import { useState } from "react";
import { Link } from "react-router-dom";
import MarkdownRenderer from "../ui/MarkdownRenderer";
import { open } from "@tauri-apps/plugin-shell";
import type { Task, Epic, TaskDependency } from "../../api/generated";

// Extended task type for v2 support
type TaskWithV2Fields = Omit<Task, "epicId"> & {
  publicId?: string;
  displayKey?: string;
  epicId?: number | string | null;
  epicDisplayKey?: string;
  priority?: string;
};

interface TaskContextTabProps {
  task: TaskWithV2Fields;
  dependencies: TaskDependency[];
  epic?: Epic | null;
  onAddDependency?: () => void;
  onRemoveDependency?: (dependsOnTaskId: string) => void;
}

// Status badge for dependency tasks (reserved for future use)
function _DependencyStatusBadge({ status }: { status: string }) {
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
        "bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
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
  task: _task,
  dependencies,
  epic,
  onAddDependency,
  onRemoveDependency,
}: TaskContextTabProps) {
  // Note: Task state API endpoint is not available in v2 API yet
  // Commenting out for now until the endpoint is added
  const [stateInfo] = useState<{
    state?: {
      hasChainInputs?: boolean;
      hasChainOutput?: boolean;
    };
    filePath?: string | null;
    _exists?: boolean;
  } | null>(null);
  const [stateContent] = useState<string | null>(null);
  const stateLoading = false;
  const stateError: string | null = null;

  // Note: TaskDependency in v2 API only contains IDs, not full task objects
  // Cannot determine completion status without fetching individual tasks
  const blockedByCount = dependencies.length;

  // Open file in default editor
  const handleOpenInEditor = async () => {
    if (stateInfo?.filePath) {
      try {
        await open(stateInfo.filePath);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    }
  };

  // Get relative path for display
  const getRelativePath = (fullPath: string | null) => {
    if (!fullPath) return null;
    const specfluxIndex = fullPath.indexOf(".specflux");
    if (specfluxIndex !== -1) {
      return fullPath.substring(specfluxIndex);
    }
    return fullPath;
  };

  return (
    <div className="space-y-6">
      {/* Dependencies Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-4 h-4 text-surface-500"
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
              className="text-xs text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 font-medium"
            >
              + Add
            </button>
          )}
        </div>

        {dependencies.length > 0 ? (
          <div className="space-y-2">
            {dependencies.map((dep) => {
              // Note: In v2 API, TaskDependency only contains IDs, not full task objects
              return (
                <div
                  key={`${dep.taskId}-${dep.dependsOnTaskId}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <Link
                        to={`/tasks/${dep.dependsOnTaskId}`}
                        className="text-sm font-medium text-surface-900 dark:text-white hover:text-accent-600 dark:hover:text-accent-400 truncate block"
                      >
                        {dep.dependsOnDisplayKey}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onRemoveDependency && (
                      <button
                        onClick={() => onRemoveDependency(dep.dependsOnTaskId)}
                        className="p-1 text-surface-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">
            No dependencies - this task can start anytime
          </p>
        )}
      </div>

      {/* Epic Context Section */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
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
          <p className="text-sm text-surface-500 dark:text-surface-400 italic">
            Not assigned to an epic
          </p>
        )}
      </div>

      {/* Task State File Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-4 h-4 text-accent-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Task State
            {stateInfo?.state?.hasChainInputs && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 rounded">
                has chain inputs
              </span>
            )}
            {stateInfo?.state?.hasChainOutput && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                has chain output
              </span>
            )}
          </h3>
          {stateInfo?.filePath && (
            <button
              onClick={handleOpenInEditor}
              className="text-xs text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 font-medium flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open in Editor
            </button>
          )}
        </div>

        {stateLoading ? (
          <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Loading task state...
            </p>
          </div>
        ) : stateError ? (
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {stateError}
            </p>
          </div>
        ) : !stateInfo?._exists ? (
          <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
            <p className="text-sm text-surface-500 dark:text-surface-400 italic">
              No task state file yet. Start the agent to create one.
            </p>
            {stateInfo?.filePath && (
              <p className="mt-2 text-xs text-surface-400 dark:text-surface-500 font-mono">
                {getRelativePath(stateInfo.filePath)}
              </p>
            )}
          </div>
        ) : stateContent ? (
          <div className="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <MarkdownRenderer source={stateContent} />
            </div>
            {stateInfo?.filePath && (
              <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800">
                <p className="text-xs text-surface-400 dark:text-surface-500 font-mono truncate">
                  {getRelativePath(stateInfo.filePath)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
            <p className="text-sm text-surface-500 dark:text-surface-400 italic">
              State file exists but could not be read.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
