import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { open } from "@tauri-apps/plugin-shell";
import {
  api,
  type Task as V2Task,
  type TaskStatus,
  type TaskDependency,
} from "../api";
import { useProject } from "../contexts";
import { TaskOverviewTab, TaskContextTab } from "../components/tasks";
import TaskDetailHeader from "../components/tasks/TaskDetailHeader";
import { TabNavigation } from "../components/ui";
import { useTerminal } from "../contexts/TerminalContext";

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
  const { getProjectRef } = useProject();
  const {
    openTerminalForContext,
    activeTask,
    isRunning: terminalIsRunning,
  } = useTerminal();

  // Tab state from URL
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const [task, setTask] = useState<V2Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Check if terminal is showing this task
  const isTerminalShowingThisTask = activeTask?.id === taskId;

  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);

      const projectRef = getProjectRef();
      if (!projectRef) {
        setError("No project selected");
        setLoading(false);
        return;
      }

      const v2Task = await api.tasks.getTask({
        projectRef,
        taskRef: taskId,
      });
      setTask(v2Task);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load task";
      setError(message);
      console.error("Failed to fetch task:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId, getProjectRef]);

  // Fetch task dependencies
  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;

    const projectRef = getProjectRef();
    if (!projectRef) return;

    try {
      const response = await api.tasks.listTaskDependencies({
        projectRef,
        taskRef: taskId,
      });
      setDependencies(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
      setDependencies([]);
    }
  }, [taskId, getProjectRef]);

  // Update task's epic assignment
  const handleEpicChange = async (newEpicRef: number | string | null) => {
    if (!task) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      return;
    }

    try {
      await api.tasks.updateTask({
        projectRef,
        taskRef: task.id,
        updateTaskRequest: {
          epicRef: typeof newEpicRef === "string" ? newEpicRef : undefined,
        },
      });
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update epic";
      setError(message);
      console.error("Failed to update epic:", err);
    }
  };

  // Update task status
  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      return;
    }

    try {
      await api.tasks.updateTask({
        projectRef,
        taskRef: task.id,
        updateTaskRequest: {
          status: newStatus as TaskStatus,
        },
      });
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      console.error("Failed to update status:", err);
    }
  };

  // Update task title inline
  const handleTitleChange = async (newTitle: string) => {
    if (!task) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      return;
    }

    try {
      await api.tasks.updateTask({
        projectRef,
        taskRef: task.id,
        updateTaskRequest: { title: newTitle },
      });
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update title";
      setError(message);
      console.error("Failed to update title:", err);
    }
  };

  // Update task's assigned user
  const handleAgentChange = async (agentId: number | null) => {
    // Agent assignment not yet implemented in v2
    console.log("Agent assignment not yet implemented in v2", agentId);
  };

  // Remove dependency
  const handleRemoveDependency = async (dependsOnTaskRef: string) => {
    if (!taskId) return;

    const projectRef = getProjectRef();
    if (!projectRef) return;

    try {
      await api.tasks.removeTaskDependency({
        projectRef,
        taskRef: taskId,
        dependsOnTaskRef,
      });
      fetchDependencies();
      fetchTask();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove dependency";
      setError(message);
      console.error("Failed to remove dependency:", err);
    }
  };

  // Handle task deletion
  const handleDelete = async () => {
    if (!task) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      return;
    }

    try {
      setDeleting(true);
      await api.tasks.deleteTask({
        projectRef,
        taskRef: task.id,
      });
      navigate("/tasks");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete task";
      setError(message);
      console.error("Failed to delete task:", err);
      setDeleting(false);
    }
  };

  // Handle opening terminal for this task
  const handleOpenInTerminal = () => {
    if (task) {
      openTerminalForContext({
        type: "task",
        id: task.id,
        title: task.title,
      });
    }
  };

  useEffect(() => {
    fetchTask();
    fetchDependencies();
  }, [fetchTask, fetchDependencies]);

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

  // Convert v2 task to format expected by components
  // Note: Components still use hybrid type that extends v1 Task, so we cast status
  const taskForComponents = {
    id: 0, // Not used in v2
    v2Id: task.id,
    displayKey: task.displayKey,
    projectId: 0, // Not used in v2
    epicId: task.epicId ?? null,
    epicDisplayKey: task.epicDisplayKey,
    title: task.title,
    description: task.description ?? null,
    status: task.status as string, // Cast to string for component compatibility
    priority: task.priority,
    requiresApproval: task.requiresApproval,
    progressPercentage: 0,
    estimatedDuration: task.estimatedDuration ?? null,
    actualDuration: task.actualDuration ?? null,
    githubPrUrl: task.githubPrUrl ?? null,
    assignedAgentId: null,
    createdByUserId: 0,
    executorType: "agent" as const,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  } as any; // TODO: Update child components to use v2 types directly

  return (
    <div className="flex flex-col h-full">
      {/* Header with Status, Epic, Owner/Executor */}
      <TaskDetailHeader
        task={taskForComponents}
        projectRef={getProjectRef() ?? undefined}
        onStatusChange={handleStatusChange}
        onEpicChange={handleEpicChange}
        onAgentChange={handleAgentChange}
        onTitleChange={handleTitleChange}
        onDelete={handleDelete}
        onBack={() => navigate(-1)}
        deleting={deleting}
      />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm mb-4 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Content - Main area with sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-system-200 dark:border-system-800 bg-white dark:bg-system-900">
        {/* Main Content - Tabbed Task Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Navigation */}
          <TabNavigation
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {activeTab === "overview" && (
              <TaskOverviewTab
                task={taskForComponents}
                projectRef={getProjectRef() ?? undefined}
                onTaskUpdate={fetchTask}
              />
            )}

            {activeTab === "context" && (
              <TaskContextTab
                task={taskForComponents}
                dependencies={dependencies.map((d) => ({
                  id: 0,
                  taskId: 0,
                  dependsOnTaskId: 0,
                  dependsOnTaskRef: d.dependsOnTaskId,
                  dependsOnDisplayKey: d.dependsOnDisplayKey,
                }))}
                epic={null}
                onAddDependency={() => {
                  // TODO: Implement add dependency modal for v2
                  console.log("Add dependency not yet implemented");
                }}
                onRemoveDependency={(depId) => {
                  // Find the dependency by id to get the ref
                  const dep = dependencies.find(
                    (_, idx) => idx === depId || depId === 0,
                  );
                  if (dep) {
                    handleRemoveDependency(dep.dependsOnTaskId);
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-800/50 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Terminal Section */}
            <div>
              <h3 className="text-xs font-semibold text-system-500 dark:text-system-400 uppercase mb-3">
                Terminal
              </h3>
              <button
                onClick={handleOpenInTerminal}
                className="btn btn-secondary w-full text-sm"
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
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Open in Terminal
              </button>
              {isTerminalShowingThisTask && terminalIsRunning && (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Terminal is active for this task
                </p>
              )}
            </div>

            {/* PR Section */}
            {task.githubPrUrl && (
              <div>
                <h3 className="text-xs font-semibold text-system-500 dark:text-system-400 uppercase mb-3">
                  Pull Request
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (task.githubPrUrl) open(task.githubPrUrl);
                    }}
                    className="flex items-center gap-2 text-sm text-brand-500 dark:text-brand-400 hover:underline"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    View Pull Request
                  </button>
                  <button
                    onClick={() => {
                      if (task.githubPrUrl)
                        navigator.clipboard.writeText(task.githubPrUrl);
                    }}
                    className="flex items-center gap-2 text-xs text-system-500 hover:text-system-700 dark:hover:text-system-300"
                  >
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy URL
                  </button>
                </div>
              </div>
            )}

            {/* Task Info */}
            <div>
              <h3 className="text-xs font-semibold text-system-500 dark:text-system-400 uppercase mb-3">
                Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-system-500 dark:text-system-400">ID</dt>
                  <dd className="font-mono text-system-700 dark:text-system-300">
                    {task.displayKey}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-system-500 dark:text-system-400">
                    Priority
                  </dt>
                  <dd className="text-system-700 dark:text-system-300">
                    {task.priority}
                  </dd>
                </div>
                {task.estimatedDuration && (
                  <div className="flex justify-between">
                    <dt className="text-system-500 dark:text-system-400">
                      Estimate
                    </dt>
                    <dd className="text-system-700 dark:text-system-300">
                      {task.estimatedDuration}h
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-system-500 dark:text-system-400">
                    Created
                  </dt>
                  <dd className="text-system-700 dark:text-system-300">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
