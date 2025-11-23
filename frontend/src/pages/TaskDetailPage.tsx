import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  api,
  type Task,
  type AgentStatus,
  type TaskDiff,
  type ApproveAndPRResult,
  ControlTaskAgentRequestActionEnum,
  AgentStatusStatusEnum,
} from "../api";
import Terminal from "../components/Terminal";

// Helper to open external URLs using Tauri command
const openExternal = async (url: string) => {
  try {
    await invoke("open_url", { url });
  } catch {
    // Fallback for non-Tauri environments or errors
    window.open(url, "_blank");
  }
};

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-500",
  ready: "bg-blue-500",
  in_progress: "bg-yellow-500",
  pending_review: "bg-purple-500",
  approved: "bg-green-500",
  done: "bg-emerald-600",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "bg-gray-500";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} text-white capitalize`}
    >
      {label}
    </span>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-gray-500",
    running: "bg-green-500",
    paused: "bg-yellow-500",
    stopped: "bg-red-500",
    completed: "bg-emerald-600",
    failed: "bg-red-600",
  };
  const color = colors[status] || "bg-gray-500";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} text-white capitalize`}
    >
      {status === "running" && (
        <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
      )}
      {status}
    </span>
  );
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [taskDiff, setTaskDiff] = useState<TaskDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [createPRLoading, setCreatePRLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [prResult, setPRResult] = useState<ApproveAndPRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.tasks.getTask({ id: Number(taskId) });
      setTask(response.data ?? null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load task";
      setError(message);
      console.error("Failed to fetch task:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchAgentStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      setAgentLoading(true);
      const response = await api.tasks.getTaskAgentStatus({
        id: Number(taskId),
      });
      setAgentStatus(response.data ?? null);
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
    } finally {
      setAgentLoading(false);
    }
  }, [taskId]);

  const fetchDiff = useCallback(async () => {
    if (!taskId) return;

    try {
      setDiffLoading(true);
      const response = await api.tasks.getTaskDiff({ id: Number(taskId) });
      setTaskDiff(response.data ?? null);
    } catch (err) {
      console.error("Failed to fetch diff:", err);
    } finally {
      setDiffLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    fetchAgentStatus();
  }, [fetchTask, fetchAgentStatus]);

  // Fetch diff when task is in pending_review
  useEffect(() => {
    if (task?.status === "pending_review") {
      fetchDiff();
    }
  }, [task?.status, fetchDiff]);

  const handleCreatePR = async () => {
    if (!taskId) return;

    try {
      setCreatePRLoading(true);
      setError(null);
      const response = await api.tasks.createTaskPR({
        id: Number(taskId),
      });
      setPRResult(response.data ?? null);
      // Refresh task to persist PR URL from database
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create PR";
      setError(message);
      console.error("Failed to create PR:", err);
    } finally {
      setCreatePRLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!taskId) return;

    try {
      setApproveLoading(true);
      setError(null);
      await api.tasks.approveTask({
        id: Number(taskId),
      });
      fetchTask(); // Refresh task to get updated status (should be 'done')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve task";
      setError(message);
      console.error("Failed to approve:", err);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleAgentAction = async (
    action: ControlTaskAgentRequestActionEnum,
  ) => {
    if (!taskId) return;

    try {
      setActionLoading(true);
      setError(null);
      const response = await api.tasks.controlTaskAgent({
        id: Number(taskId),
        controlTaskAgentRequest: { action },
      });
      setAgentStatus(response.data ?? null);
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} agent`;
      setError(message);
      console.error(`Failed to ${action} agent:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const isAgentRunning = agentStatus?.status === AgentStatusStatusEnum.Running;
  const isAgentPaused = agentStatus?.status === AgentStatusStatusEnum.Paused;
  const isAgentIdle =
    !agentStatus ||
    agentStatus.status === AgentStatusStatusEnum.Idle ||
    agentStatus.status === AgentStatusStatusEnum.Stopped ||
    agentStatus.status === AgentStatusStatusEnum.Completed ||
    agentStatus.status === AgentStatusStatusEnum.Failed;

  // Memoize the onStatusChange callback to prevent unnecessary re-renders
  const handleTerminalStatusChange = useCallback(
    (running: boolean) => {
      if (running !== isAgentRunning) {
        fetchAgentStatus();
        // When agent stops, refresh task to get updated status (e.g., pending_review)
        if (!running) {
          // Small delay to allow backend to process completion
          setTimeout(() => {
            fetchTask();
          }, 500);
        }
      }
    },
    [isAgentRunning, fetchAgentStatus, fetchTask],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg
          className="animate-spin w-8 h-8 text-indigo-500"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg">Error loading task</div>
        <p className="text-gray-500 mt-2">{error}</p>
        <button
          onClick={() => navigate("/tasks")}
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">Task not found</div>
        <button
          onClick={() => navigate("/tasks")}
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/tasks")}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Tasks
          </button>
          <div className="h-6 w-px bg-gray-700" />
          <span className="text-gray-400 text-sm">#{task.id}</span>
          <h1 className="text-xl font-semibold text-white">{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm mb-4 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Content - Split Pane */}
      <div className="flex flex-1 min-h-0 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Left Panel - Task Details */}
        <div className="w-80 border-r border-gray-700 p-4 overflow-y-auto flex-shrink-0">
          {/* Description */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-300">
              {task.description || "No description provided"}
            </p>
          </div>

          {/* Agent Status */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              Agent Status
            </h3>
            {agentLoading ? (
              <span className="text-gray-500 text-sm">Loading...</span>
            ) : agentStatus ? (
              <div className="space-y-2">
                <AgentStatusBadge status={agentStatus.status} />
                {agentStatus.pid && (
                  <p className="text-xs text-gray-500">
                    PID: {agentStatus.pid}
                  </p>
                )}
                {agentStatus.startedAt && (
                  <p className="text-xs text-gray-500">
                    Started:{" "}
                    {new Date(agentStatus.startedAt).toLocaleTimeString()}
                  </p>
                )}
                {agentStatus.errorMessage && (
                  <p className="text-xs text-red-400">
                    Error: {agentStatus.errorMessage}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-gray-500 text-sm">No agent running</span>
            )}
          </div>

          {/* Progress */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Progress</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${task.progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-400">
                {task.progressPercentage}%
              </span>
            </div>
          </div>

          {/* Repository */}
          {task.repoName && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Repository
              </h3>
              <p className="text-sm text-gray-300">{task.repoName}</p>
            </div>
          )}

          {/* Agent Controls */}
          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Agent Controls
            </h3>
            <div className="flex flex-wrap gap-2">
              {isAgentIdle && (
                <button
                  onClick={() =>
                    handleAgentAction(ControlTaskAgentRequestActionEnum.Start)
                  }
                  disabled={
                    actionLoading ||
                    task.status === "done" ||
                    task.status === "approved"
                  }
                  className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {actionLoading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  )}
                  Start
                </button>
              )}
              {isAgentRunning && (
                <>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Pause)
                    }
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                    </svg>
                    Pause
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
                    </svg>
                    Stop
                  </button>
                </>
              )}
              {isAgentPaused && (
                <>
                  <button
                    onClick={() =>
                      handleAgentAction(
                        ControlTaskAgentRequestActionEnum.Resume,
                      )
                    }
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Resume
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z" />
                    </svg>
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Review Section - shown when pending_review or has PR */}
          {(task.status === "pending_review" ||
            task.status === "done" ||
            task.status === "approved" ||
            task.githubPrUrl ||
            prResult?.prUrl) && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Review & Approve
              </h3>

              {/* PR Link */}
              {(task.githubPrUrl || prResult?.prUrl) && (
                <button
                  onClick={() =>
                    openExternal(task.githubPrUrl || prResult?.prUrl || "")
                  }
                  className="inline-block mb-3 text-blue-400 text-sm hover:underline text-left"
                >
                  View PR #{task.githubPrNumber || prResult?.prNumber}
                </button>
              )}

              {/* Changes info - only show when pending_review */}
              {task.status === "pending_review" && (
                <>
                  {diffLoading ? (
                    <p className="text-gray-500 text-sm">Loading changes...</p>
                  ) : taskDiff ? (
                    <div className="mb-3">
                      {taskDiff.hasChanges ? (
                        <>
                          <p className="text-sm text-gray-300 mb-2">
                            {taskDiff.filesChanged?.length ?? 0} file(s) changed
                            {taskDiff.insertions !== undefined && (
                              <span className="text-green-400 ml-2">
                                +{taskDiff.insertions}
                              </span>
                            )}
                            {taskDiff.deletions !== undefined && (
                              <span className="text-red-400 ml-1">
                                -{taskDiff.deletions}
                              </span>
                            )}
                          </p>
                          <ul className="text-xs text-gray-400 space-y-1 max-h-24 overflow-y-auto">
                            {taskDiff.filesChanged?.map((file, i) => (
                              <li key={i} className="truncate">
                                {file}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No changes detected
                        </p>
                      )}
                    </div>
                  ) : null}
                </>
              )}

              {/* Action buttons - only show when pending_review */}
              {task.status === "pending_review" && (
                <div className="flex flex-col gap-2">
                  {/* Create PR button - only show if PR not created yet and has changes */}
                  {!task.githubPrUrl &&
                    !prResult?.prUrl &&
                    taskDiff?.hasChanges && (
                      <button
                        onClick={handleCreatePR}
                        disabled={createPRLoading}
                        className="w-full px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {createPRLoading ? (
                          <>
                            <svg
                              className="animate-spin w-4 h-4"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Creating PR...
                          </>
                        ) : (
                          <>
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
                                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                              />
                            </svg>
                            Create PR
                          </>
                        )}
                      </button>
                    )}

                  {/* Approve button */}
                  <button
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="w-full px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {approveLoading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Approving...
                      </>
                    ) : (
                      <>
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          <Terminal
            taskId={task.id}
            onStatusChange={handleTerminalStatusChange}
            onRefresh={fetchAgentStatus}
          />
        </div>
      </div>
    </div>
  );
}
