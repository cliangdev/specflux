import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  api,
  type Task,
  type Epic,
  type AgentStatus,
  type TaskDiff,
  type ApproveAndPRResult,
  type TaskDependency,
  type User,
  ControlTaskAgentRequestActionEnum,
  AgentStatusStatusEnum,
} from "../api";
import FileChanges from "../components/FileChanges";
import {
  AddDependencyModal,
  ReadinessChecklist,
  TaskOverviewTab,
  TaskContextTab,
} from "../components/tasks";
import TaskDetailHeader from "../components/tasks/TaskDetailHeader";
import { TaskEditModal, TabNavigation } from "../components/ui";
import { useTerminal } from "../contexts/TerminalContext";
import { calculateReadiness } from "../utils/readiness";

// Helper to open external URLs using Tauri command
const openExternal = async (url: string) => {
  try {
    await invoke("open_url", { url });
  } catch {
    // Fallback for non-Tauri environments or errors
    window.open(url, "_blank");
  }
};

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

// Tab definitions
const TABS = [
  {
    id: "overview",
    label: "Overview",
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "context",
    label: "Context",
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
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
  },
];

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    openTerminalForTask,
    activeTask,
    isRunning: terminalIsRunning,
  } = useTerminal();

  // Tab state from URL
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [ownerUser, setOwnerUser] = useState<User | null>(null);

  // Check if terminal is showing this task
  const isTerminalShowingThisTask = activeTask?.id === Number(taskId);

  // Calculate readiness when task changes
  const readiness = useMemo(() => {
    if (!task)
      return {
        score: 0,
        isReady: false,
        criteria: {} as any,
        criteriaLabels: [],
      };
    return calculateReadiness(task);
  }, [task]);

  // Get current epic from the epics list
  const currentEpic = useMemo(() => {
    if (!task?.epicId) return null;
    return epics.find((e) => e.id === task.epicId) ?? null;
  }, [task?.epicId, epics]);

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

  // Update task status
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      await api.tasks.updateTask({
        id: task.id,
        updateTaskRequest: {
          status: newStatus as
            | "backlog"
            | "ready"
            | "in_progress"
            | "pending_review"
            | "approved"
            | "done",
        },
      });
      // Refresh task data
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      console.error("Failed to update status:", err);
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
      {/* Header with Status, Epic, Owner/Executor, and Readiness */}
      <TaskDetailHeader
        task={task}
        epic={currentEpic}
        owner={ownerUser}
        readiness={readiness}
        onStatusChange={handleStatusChange}
        onEdit={() => setShowEditModal(true)}
        onBack={() => navigate(-1)}
      />

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
        {/* Left Panel - Tabbed Task Details */}
        <div className="w-1/3 border-r border-system-200 dark:border-system-800 flex flex-col bg-white dark:bg-system-900">
          {/* Tab Navigation */}
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Overview Tab Content */}
                <TaskOverviewTab task={task} />

                {/* Definition of Ready Checklist */}
                <div>
                  <h3 className="text-sm font-semibold text-system-900 dark:text-white mb-2">
                    Definition of Ready
                  </h3>
                  <ReadinessChecklist
                    readiness={readiness}
                    onAddCriteria={() => setShowEditModal(true)}
                    onAssignExecutor={() => setShowEditModal(true)}
                    onAssignRepo={() => setShowEditModal(true)}
                  />
                </div>
              </div>
            )}

            {activeTab === "context" && (
              <TaskContextTab
                task={task}
                dependencies={dependencies}
                epic={currentEpic}
                onAddDependency={() => setShowAddDependencyModal(true)}
                onRemoveDependency={handleRemoveDependency}
              />
            )}
          </div>

          {/* Sidebar - Agent Controls & Actions (always visible) */}
          <div className="border-t border-system-200 dark:border-system-700 p-4 space-y-4 bg-system-50 dark:bg-system-800/50">
            {/* Agent Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-system-500 dark:text-system-400 uppercase">
                Agent
              </span>
              {agentLoading ? (
                <span className="text-system-500 text-sm">Loading...</span>
              ) : (
                <AgentStatusBadge status={agentStatus?.status ?? "idle"} />
              )}
            </div>

            {/* Agent Controls */}
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
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Start Agent
                </button>
              )}
              {isAgentRunning && (
                <>
                  <button
                    onClick={() =>
                      handleAgentAction(ControlTaskAgentRequestActionEnum.Pause)
                    }
                    disabled={actionLoading}
                    className="btn btn-secondary flex-1 disabled:opacity-50"
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
                    className="btn btn-secondary flex-1 disabled:opacity-50"
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

            {/* File Changes Summary */}
            <div>
              <FileChanges
                taskId={task.id}
                isAgentRunning={isAgentRunning}
                onHasChanges={(has) => setHasFileChanges(has)}
              />
            </div>

            {/* PR Actions */}
            {hasFileChanges &&
              !prResult?.prUrl &&
              !task.githubPrUrl &&
              task.status !== "done" && (
                <button
                  onClick={handleCreatePR}
                  disabled={createPRLoading}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {createPRLoading ? "Creating PR..." : "Create PR"}
                </button>
              )}

            {/* PR Link & Approve */}
            {(prResult?.prUrl || task.githubPrUrl) && (
              <div className="space-y-2">
                <button
                  onClick={() =>
                    openExternal(prResult?.prUrl || task.githubPrUrl || "")
                  }
                  className="text-brand-500 dark:text-brand-400 text-sm hover:underline"
                >
                  View PR #{prResult?.prNumber || task.githubPrNumber}
                </button>
                {task.status !== "done" && (
                  <button
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="btn btn-success w-full disabled:opacity-50"
                  >
                    {approveLoading ? "Approving..." : "Approve & Complete"}
                  </button>
                )}
              </div>
            )}
          </div>
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
                  Press ⌘T to toggle the terminal panel
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
                  disabled={!readiness.isReady}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    readiness.isReady
                      ? "bg-brand-600 hover:bg-brand-700 text-white"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                  title={
                    readiness.isReady
                      ? "Start agent in terminal"
                      : `Task not ready (${readiness.score}% complete)`
                  }
                >
                  Open in Terminal
                </button>
                {!readiness.isReady && (
                  <p className="text-xs mt-2 text-amber-400">
                    Complete Definition of Ready ({readiness.score}%) to enable
                  </p>
                )}
                <p className="text-xs mt-3 text-slate-500">
                  Or press ⌘T to toggle the terminal panel
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

      {/* Edit Task Modal */}
      {showEditModal && (
        <TaskEditModal
          task={task}
          projectId={task.projectId}
          onClose={() => setShowEditModal(false)}
          onUpdated={fetchTask}
        />
      )}
    </div>
  );
}
