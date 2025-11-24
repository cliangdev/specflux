import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  api,
  type Task,
  type AgentStatus,
  type TaskDiff,
  type ApproveAndPRResult,
  type TaskFileChanges,
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

// Status badge configuration matching the mock design
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: string; classes: string }
> = {
  backlog: {
    label: "Backlog",
    icon: "inbox",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  ready: {
    label: "Ready",
    icon: "circle-dashed",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  in_progress: {
    label: "In Progress",
    icon: "timer",
    classes:
      "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800",
  },
  pending_review: {
    label: "Pending Review",
    icon: "eye",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  approved: {
    label: "Approved",
    icon: "check-circle",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  done: {
    label: "Done",
    icon: "check-circle",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

// SVG icons for status badges
const StatusIcons: Record<string, JSX.Element> = {
  inbox: (
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
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  "circle-dashed": (
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
  timer: (
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  eye: (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  "check-circle": (
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
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, " "),
    icon: "circle-dashed",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.classes}`}
    >
      {StatusIcons[config.icon]}
      {config.label}
    </span>
  );
}

// Agent status badge configuration
const AGENT_STATUS_CONFIG: Record<string, { classes: string; dot?: boolean }> =
  {
    idle: {
      classes:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    },
    running: {
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      dot: true,
    },
    paused: {
      classes:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    },
    stopped: {
      classes:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    completed: {
      classes:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
    failed: {
      classes:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    },
  };

function AgentStatusBadge({ status }: { status: string }) {
  const config = AGENT_STATUS_CONFIG[status] || AGENT_STATUS_CONFIG.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${config.classes}`}
    >
      {config.dot && (
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
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
  const [fileChanges, setFileChanges] = useState<TaskFileChanges | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [fileChangesLoading, setFileChangesLoading] = useState(false);
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

  const fetchFileChanges = useCallback(async () => {
    if (!taskId) return;

    try {
      setFileChangesLoading(true);
      const response = await api.tasks.getTaskFileChanges({
        id: Number(taskId),
      });
      setFileChanges(response.data ?? null);
    } catch (err) {
      console.error("Failed to fetch file changes:", err);
    } finally {
      setFileChangesLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    fetchAgentStatus();
    fetchFileChanges();
  }, [fetchTask, fetchAgentStatus, fetchFileChanges]);

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

  // Poll for file changes (git-based tracking)
  // Fast polling when agent is running, slower when idle
  useEffect(() => {
    const pollInterval = isAgentRunning ? 3000 : 10000; // 3s when running, 10s when idle

    const interval = setInterval(() => {
      fetchFileChanges();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isAgentRunning, fetchFileChanges]);

  // Memoize the onStatusChange callback to prevent unnecessary re-renders
  const handleTerminalStatusChange = useCallback(
    (running: boolean) => {
      if (running !== isAgentRunning) {
        fetchAgentStatus();
        // When agent stops, refresh task and file changes
        if (!running) {
          // Small delay to allow backend to process completion
          setTimeout(() => {
            fetchTask();
            fetchFileChanges();
          }, 500);
        }
      }
    },
    [isAgentRunning, fetchAgentStatus, fetchTask, fetchFileChanges],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg
          className="animate-spin w-8 h-8 text-brand-500"
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
        <div className="text-red-500 dark:text-red-400 text-lg">
          Error loading task
        </div>
        <p className="text-system-500 mt-2">{error}</p>
        <button
          onClick={() => navigate("/tasks")}
          className="btn btn-secondary mt-4"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          Task not found
        </div>
        <button
          onClick={() => navigate("/tasks")}
          className="btn btn-secondary mt-4"
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
            className="flex items-center gap-1 text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-white transition-colors"
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
          <div className="h-6 w-px bg-system-200 dark:bg-system-700" />
          <span className="text-system-500 dark:text-system-400 text-sm">
            #{task.id}
          </span>
          <h1 className="text-xl font-semibold text-system-900 dark:text-white">
            {task.title}
          </h1>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm mb-4 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Content - Split Pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-system-200 dark:border-system-800">
        {/* Left Panel - Task Details */}
        <div className="w-1/2 border-r border-system-200 dark:border-system-800 p-6 overflow-y-auto bg-white dark:bg-system-900 scrollbar-thin">
          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-2">
              Description
            </h2>
            <p className="text-sm text-system-600 dark:text-system-300 leading-relaxed">
              {task.description || "No description provided"}
            </p>
          </div>

          {/* Agent Status */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              Agent Status
            </h3>
            {agentLoading ? (
              <span className="text-system-500 text-sm">Loading...</span>
            ) : agentStatus ? (
              <div className="space-y-2">
                <AgentStatusBadge status={agentStatus.status} />
                {agentStatus.pid && (
                  <p className="text-xs text-system-500">
                    PID: {agentStatus.pid}
                  </p>
                )}
                {agentStatus.startedAt && (
                  <p className="text-xs text-system-500">
                    Started:{" "}
                    {new Date(agentStatus.startedAt).toLocaleTimeString()}
                  </p>
                )}
                {agentStatus.errorMessage && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    Error: {agentStatus.errorMessage}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-system-500 text-sm">No agent running</span>
            )}
          </div>

          {/* Progress */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              Progress
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-system-200 dark:bg-system-700 rounded-full h-1.5">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${task.progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-system-500 dark:text-system-400">
                {task.progressPercentage}%
              </span>
            </div>
          </div>

          {/* Repository */}
          {task.repoName && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
                Repository
              </h3>
              <p className="text-sm text-system-700 dark:text-system-300">
                {task.repoName}
              </p>
            </div>
          )}

          {/* File Changes - tracked during agent execution */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              File Changes
            </h3>
            {fileChangesLoading ? (
              <p className="text-system-500 text-sm">Loading...</p>
            ) : fileChanges && fileChanges.changes.length > 0 ? (
              <div className="space-y-2">
                {/* Summary badges */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {fileChanges.summary.created > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      {fileChanges.summary.created} created
                    </span>
                  )}
                  {fileChanges.summary.modified > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      {fileChanges.summary.modified} modified
                    </span>
                  )}
                  {fileChanges.summary.deleted > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      {fileChanges.summary.deleted} deleted
                    </span>
                  )}
                </div>
                {/* File list */}
                <ul className="text-xs text-system-600 dark:text-system-400 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {fileChanges.changes.map((change) => (
                    <li
                      key={change.id}
                      className="flex items-center gap-1.5 py-0.5"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          change.changeType === "created"
                            ? "bg-emerald-500"
                            : change.changeType === "deleted"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />
                      <span className="truncate" title={change.filePath}>
                        {change.filePath}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-system-500 dark:text-system-400">
                No file changes tracked yet
              </p>
            )}
          </div>

          {/* Agent Controls - in a card */}
          <div className="p-4 bg-system-50 dark:bg-system-800 rounded-lg border border-system-200 dark:border-system-700">
            <h3 className="text-sm font-medium text-system-900 dark:text-white mb-3">
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
                    className="flex-1 py-1.5 text-sm font-medium bg-white dark:bg-system-700 border border-system-200 dark:border-system-600 rounded shadow-sm hover:bg-system-50 dark:hover:bg-system-600 transition-colors disabled:opacity-50"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="flex-1 py-1.5 text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  >
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
                    className="flex-1 py-1.5 text-sm font-medium bg-white dark:bg-system-700 border border-system-200 dark:border-system-600 rounded shadow-sm hover:bg-system-50 dark:hover:bg-system-600 transition-colors disabled:opacity-50"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="flex-1 py-1.5 text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  >
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
            <div className="mt-6">
              <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-3">
                Review & Approve
              </h3>

              {/* PR Link */}
              {(task.githubPrUrl || prResult?.prUrl) && (
                <button
                  onClick={() =>
                    openExternal(task.githubPrUrl || prResult?.prUrl || "")
                  }
                  className="inline-block mb-3 text-brand-500 dark:text-brand-400 text-sm hover:underline text-left"
                >
                  View PR #{task.githubPrNumber || prResult?.prNumber}
                </button>
              )}

              {/* Changes info - only show when pending_review */}
              {task.status === "pending_review" && (
                <>
                  {diffLoading ? (
                    <p className="text-system-500 text-sm">
                      Loading changes...
                    </p>
                  ) : taskDiff ? (
                    <div className="mb-3">
                      {taskDiff.hasChanges ? (
                        <>
                          <p className="text-sm text-system-700 dark:text-system-300 mb-2">
                            {taskDiff.filesChanged?.length ?? 0} file(s) changed
                            {taskDiff.insertions !== undefined && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                                +{taskDiff.insertions}
                              </span>
                            )}
                            {taskDiff.deletions !== undefined && (
                              <span className="text-red-600 dark:text-red-400 ml-1">
                                -{taskDiff.deletions}
                              </span>
                            )}
                          </p>
                          <ul className="text-xs text-system-500 dark:text-system-400 space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
                            {taskDiff.filesChanged?.map((file, i) => (
                              <li key={i} className="truncate">
                                {file}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-system-500 dark:text-system-400">
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
        <div className="w-1/2 flex flex-col min-w-0">
          <Terminal
            taskId={task.id}
            onStatusChange={handleTerminalStatusChange}
            onRefresh={fetchAgentStatus}
            onFileChange={() => {
              // Refetch file changes when a new file change event is received
              fetchFileChanges();
            }}
          />
        </div>
      </div>
    </div>
  );
}
