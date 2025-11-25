import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  api,
  type Task,
  type Epic,
  type AgentStatus,
  type TaskDiff,
  type ApproveAndPRResult,
  type TaskDependency,
  ControlTaskAgentRequestActionEnum,
  AgentStatusStatusEnum,
} from "../api";
import FileChanges from "../components/FileChanges";
import { DependencyList, AddDependencyModal } from "../components/tasks";
import { useTerminal } from "../contexts/TerminalContext";

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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${config.classes}`}
    >
      {StatusIcons[config.icon]}
      {config.label}
    </span>
  );
}

// Agent status badge configuration
// "running" means the process is alive - could be working or waiting for input
const AGENT_STATUS_CONFIG: Record<
  string,
  { label: string; classes: string; dot?: boolean }
> = {
  idle: {
    label: "Idle",
    classes:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  running: {
    label: "Active", // More accurate than "Running" - agent is alive, may be working or waiting
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: true,
  },
  paused: {
    label: "Paused",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  stopped: {
    label: "Stopped",
    classes:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  completed: {
    label: "Completed",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  failed: {
    label: "Failed",
    classes:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

function AgentStatusBadge({ status }: { status: string }) {
  const config = AGENT_STATUS_CONFIG[status] || AGENT_STATUS_CONFIG.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}
    >
      {config.dot && (
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      )}
      {config.label}
    </span>
  );
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const {
    openTerminalForTask,
    activeTask,
    isRunning: terminalIsRunning,
  } = useTerminal();

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
  const [hasFileChanges, setHasFileChanges] = useState(false);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [epicLoading, setEpicLoading] = useState(false);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [showAddDependencyModal, setShowAddDependencyModal] = useState(false);

  // Check if terminal is showing this task
  const isTerminalShowingThisTask = activeTask?.id === Number(taskId);

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

  // Fetch epics for the project when task is loaded
  const fetchEpics = useCallback(async (projectId: number) => {
    try {
      const response = await api.epics.listEpics({ id: projectId });
      setEpics(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch epics:", err);
    }
  }, []);

  // Fetch task dependencies
  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;
    try {
      const response = await api.tasks.listTaskDependencies({
        id: Number(taskId),
      });
      setDependencies(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
    }
  }, [taskId]);

  // Update task's epic assignment
  const handleEpicChange = async (newEpicId: number | null) => {
    if (!task) return;

    try {
      setEpicLoading(true);
      await api.tasks.updateTask({
        id: task.id,
        updateTaskRequest: { epicId: newEpicId },
      });
      // Refresh task data
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update epic";
      setError(message);
      console.error("Failed to update epic:", err);
    } finally {
      setEpicLoading(false);
    }
  };

  // Remove dependency
  const handleRemoveDependency = async (dependencyId: number) => {
    if (!taskId) return;
    try {
      await api.tasks.removeTaskDependency({
        id: Number(taskId),
        depId: dependencyId,
      });
      // Refresh dependencies and task (blocked_by_count may change)
      fetchDependencies();
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove dependency";
      setError(message);
      console.error("Failed to remove dependency:", err);
    }
  };

  // Handle dependency added from modal
  const handleDependencyAdded = () => {
    fetchDependencies();
    fetchTask(); // Refresh task to update blocked_by_count
  };

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
    fetchDependencies();
  }, [fetchTask, fetchAgentStatus, fetchDependencies]);

  // Fetch diff when task is in pending_review
  useEffect(() => {
    if (task?.status === "pending_review") {
      fetchDiff();
    }
  }, [task?.status, fetchDiff]);

  // Fetch epics when task is loaded
  useEffect(() => {
    if (task?.projectId) {
      fetchEpics(task.projectId);
    }
  }, [task?.projectId, fetchEpics]);

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
      let message = "Failed to create PR";
      // Handle ResponseError from generated API client
      if (err && typeof err === "object" && "response" in err) {
        const responseErr = err as { response: Response };
        try {
          const body = await responseErr.response.json();
          message = body.error?.message || body.error || message;
        } catch {
          // If JSON parsing fails, use status text
          message = responseErr.response.statusText || message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
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
    if (!taskId || !task) return;

    try {
      setActionLoading(true);
      setError(null);

      // When starting, also open terminal for this task
      if (action === ControlTaskAgentRequestActionEnum.Start) {
        openTerminalForTask({ id: task.id, title: task.title });
      }

      const response = await api.tasks.controlTaskAgent({
        id: Number(taskId),
        controlTaskAgentRequest: { action },
      });
      setAgentStatus(response.data ?? null);
      // Only refresh task when stopping agent (status might change)
      if (action === ControlTaskAgentRequestActionEnum.Stop) {
        fetchTask();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${action} agent`;
      setError(message);
      console.error(`Failed to ${action} agent:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle opening terminal for this task
  const handleOpenInTerminal = () => {
    if (task) {
      openTerminalForTask({ id: task.id, title: task.title });
    }
  };

  const isAgentRunning =
    agentStatus?.status === AgentStatusStatusEnum.Running ||
    (isTerminalShowingThisTask && terminalIsRunning);
  const isAgentPaused = agentStatus?.status === AgentStatusStatusEnum.Paused;
  const isAgentIdle =
    !agentStatus ||
    agentStatus.status === AgentStatusStatusEnum.Idle ||
    agentStatus.status === AgentStatusStatusEnum.Stopped ||
    agentStatus.status === AgentStatusStatusEnum.Completed ||
    agentStatus.status === AgentStatusStatusEnum.Failed;

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
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">
          Back
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
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-white transition-colors flex-shrink-0"
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
          Back
        </button>
        <div className="h-6 w-px bg-system-200 dark:bg-system-700 flex-shrink-0" />
        <span className="text-system-500 dark:text-system-400 text-sm flex-shrink-0">
          #{task.id}
        </span>
        <h1 className="text-xl font-semibold text-system-900 dark:text-white truncate flex-1 min-w-0">
          {task.title}
        </h1>
        <StatusBadge status={task.status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm mb-4 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Blocked warning banner */}
      {(task.blockedByCount ?? 0) > 0 && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 text-sm mb-4 flex-shrink-0 flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
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
          <span>
            This task is blocked by{" "}
            <strong>
              {task.blockedByCount} incomplete{" "}
              {task.blockedByCount === 1 ? "dependency" : "dependencies"}
            </strong>
            . Complete the blocking tasks below before starting.
          </span>
        </div>
      )}

      {/* Content - Split Pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-system-200 dark:border-system-800">
        {/* Left Panel - Task Details */}
        <div className="w-1/3 border-r border-system-200 dark:border-system-800 p-6 overflow-y-auto bg-white dark:bg-system-900 scrollbar-thin">
          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-2">
              Description
            </h2>
            <p className="text-sm text-system-600 dark:text-system-300 leading-relaxed">
              {task.description || "No description provided"}
            </p>
          </div>

          {/* Epic */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              Epic
            </h3>
            <select
              value={task.epicId ?? ""}
              onChange={(e) =>
                handleEpicChange(e.target.value ? Number(e.target.value) : null)
              }
              disabled={epicLoading}
              className="select text-sm"
            >
              <option value="">No Epic</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
            </select>
          </div>

          {/* Dependencies */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider">
                Dependencies
              </h3>
              <button
                onClick={() => setShowAddDependencyModal(true)}
                className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
              >
                + Add
              </button>
            </div>
            <DependencyList
              dependencies={dependencies}
              onRemove={handleRemoveDependency}
              emptyMessage="No dependencies - this task can start anytime"
            />
          </div>

          {/* Agent Status - fixed height to prevent layout shift */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              Agent Status
            </h3>
            <div className="flex items-center gap-3">
              {agentLoading ? (
                <span className="text-system-500 text-sm">Loading...</span>
              ) : (
                <>
                  <AgentStatusBadge status={agentStatus?.status ?? "idle"} />
                  {agentStatus?.errorMessage && (
                    <span className="text-xs text-red-500 dark:text-red-400">
                      {agentStatus.errorMessage}
                    </span>
                  )}
                </>
              )}
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

          {/* Agent Controls - in a card */}
          <div className="p-4 bg-system-50 dark:bg-system-800 rounded-lg border border-system-200 dark:border-system-700">
            <h3 className="text-sm font-medium text-system-900 dark:text-white mb-3">
              Agent Controls
            </h3>
            <div className="flex gap-2">
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
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="btn btn-danger disabled:opacity-50"
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
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Stop)
                    }
                    disabled={actionLoading}
                    className="btn btn-danger disabled:opacity-50"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* File Changes - isolated component with its own state/polling */}
          <div className="mt-6">
            <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-2">
              File Changes
            </h3>
            <FileChanges
              taskId={task.id}
              isAgentRunning={isAgentRunning}
              onHasChanges={(has) => setHasFileChanges(has)}
            />

            {/* Create PR button - show when there are file changes and no PR yet */}
            {hasFileChanges &&
              !prResult?.prUrl &&
              !task.githubPrUrl &&
              task.status !== "done" && (
                <button
                  onClick={handleCreatePR}
                  disabled={createPRLoading}
                  className="mt-3 btn btn-primary disabled:opacity-50"
                >
                  {createPRLoading ? (
                    <>
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
                      Creating PR...
                    </>
                  ) : (
                    "Create PR"
                  )}
                </button>
              )}
          </div>

          {/* Review Section - shown when pending_review or has PR */}
          {(task.status === "pending_review" ||
            task.status === "done" ||
            task.status === "approved" ||
            prResult?.prUrl ||
            task.githubPrUrl) && (
            <div className="mt-6">
              <h3 className="text-xs font-bold text-system-400 uppercase tracking-wider mb-3">
                Review & Approve
              </h3>

              {/* PR Link - prefer prResult (fresh) over task (from DB) */}
              {(prResult?.prUrl || task.githubPrUrl) && (
                <button
                  onClick={() =>
                    openExternal(prResult?.prUrl || task.githubPrUrl || "")
                  }
                  className="inline-block mb-3 text-brand-500 dark:text-brand-400 text-sm hover:underline text-left"
                >
                  {prResult?.prNumber || task.githubPrNumber
                    ? `View PR #${prResult?.prNumber || task.githubPrNumber}`
                    : "View PR"}
                </button>
              )}

              {/* Action buttons - show when there's a PR and task not done */}
              {(prResult?.prUrl || task.githubPrUrl) &&
                task.status !== "done" && (
                  <div className="flex gap-2">
                    {/* Approve button */}
                    <button
                      onClick={handleApprove}
                      disabled={approveLoading}
                      className="btn btn-success disabled:opacity-50"
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
                        "Approve & Complete"
                      )}
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right Panel - Terminal Placeholder / Open in Terminal */}
        <div className="w-2/3 flex flex-col min-w-0 bg-slate-900">
          {isTerminalShowingThisTask ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <p className="text-sm font-medium">Terminal is open below</p>
                <p className="text-xs mt-1 text-slate-500">
                  Press Cmd+` to toggle the terminal panel
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <p className="text-sm font-medium mb-3">No terminal session</p>
                <button
                  onClick={handleOpenInTerminal}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Open in Terminal
                </button>
                <p className="text-xs mt-3 text-slate-500">
                  Or press Cmd+` to toggle the terminal panel
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Dependency Modal */}
      {showAddDependencyModal && (
        <AddDependencyModal
          taskId={task.id}
          projectId={task.projectId}
          existingDependencyIds={dependencies.map((d) => d.dependsOnTaskId)}
          onClose={() => setShowAddDependencyModal(false)}
          onAdded={handleDependencyAdded}
        />
      )}
    </div>
  );
}
