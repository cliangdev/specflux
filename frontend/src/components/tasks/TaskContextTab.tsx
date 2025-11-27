import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";
import type {
  Task,
  Epic,
  TaskDependency,
  GetTaskState200ResponseData,
} from "../../api/generated";
import { api } from "../../api";

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
  const [stateInfo, setStateInfo] =
    useState<GetTaskState200ResponseData | null>(null);
  const [stateContent, setStateContent] = useState<string | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  const completedDeps = dependencies.filter(
    (d) =>
      d.dependsOnTask?.status === "done" ||
      d.dependsOnTask?.status === "approved",
  );
  const blockedByCount = dependencies.length - completedDeps.length;

  // Fetch task state info from API
  const fetchStateInfo = useCallback(async () => {
    try {
      setStateLoading(true);
      setStateError(null);
      const response = await api.tasks.getTaskState({ id: task.id });
      const data = response.data;
      setStateInfo(data);

      // If file exists, read its content
      if (data?._exists && data?.filePath) {
        try {
          const content = await readTextFile(data.filePath);
          setStateContent(content);
        } catch (err) {
          console.error("Failed to read state file:", err);
          setStateContent(null);
          setStateError("Failed to read state file from disk");
        }
      } else {
        setStateContent(null);
      }
    } catch (err) {
      console.error("Failed to fetch task state:", err);
      setStateError("Failed to fetch task state info");
    } finally {
      setStateLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchStateInfo();
  }, [fetchStateInfo]);

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

      {/* Task State File Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-system-900 dark:text-white flex items-center gap-2">
            <svg
              className="w-4 h-4 text-brand-500"
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
              <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 rounded">
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
              className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium flex items-center gap-1"
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
          <div className="p-4 rounded-lg border border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50">
            <p className="text-sm text-system-500 dark:text-system-400">
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
          <div className="p-4 rounded-lg border border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50">
            <p className="text-sm text-system-500 dark:text-system-400 italic">
              No task state file yet. Start the agent to create one.
            </p>
            {stateInfo?.filePath && (
              <p className="mt-2 text-xs text-system-400 dark:text-system-500 font-mono">
                {getRelativePath(stateInfo.filePath)}
              </p>
            )}
          </div>
        ) : stateContent ? (
          <div className="rounded-lg border border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50 overflow-hidden">
            <div className="p-4 max-h-[500px] overflow-y-auto prose prose-sm dark:prose-invert prose-headings:text-system-900 dark:prose-headings:text-white prose-p:text-system-700 dark:prose-p:text-system-300 prose-code:text-brand-600 dark:prose-code:text-brand-400 prose-pre:bg-system-100 dark:prose-pre:bg-system-900 prose-blockquote:border-brand-500 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {stateContent}
              </ReactMarkdown>
            </div>
            {stateInfo?.filePath && (
              <div className="px-4 py-2 border-t border-system-200 dark:border-system-700 bg-system-100 dark:bg-system-800">
                <p className="text-xs text-system-400 dark:text-system-500 font-mono truncate">
                  {getRelativePath(stateInfo.filePath)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50">
            <p className="text-sm text-system-500 dark:text-system-400 italic">
              State file exists but could not be read.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
