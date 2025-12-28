import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { open } from "@tauri-apps/plugin-shell";
import {
  api,
  type Task as V2Task,
  type TaskStatus,
  type TaskDependency,
  type AcceptanceCriteria as AcceptanceCriterion,
} from "../api";
import { useProject } from "../contexts";
import EpicSelector from "../components/tasks/EpicSelector";
import { DetailPageHeader } from "../components/ui";
import { AIActionButton } from "../components/ui/AIActionButton";
import { AcceptanceCriteriaList } from "../components/ui/AcceptanceCriteriaList";
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import { useTerminal } from "../contexts/TerminalContext";
import { usePageContext } from "../hooks/usePageContext";
import { useHasClaudeSession } from "../hooks/useHasClaudeSession";
import { generateTaskPrompt } from "../services/promptGenerator";

// Task status options for DetailPageHeader
const TASK_STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "COMPLETED", label: "Completed" },
];

// Priority badge configuration
const PRIORITY_CONFIG: Record<string, { label: string; classes: string }> = {
  low: {
    label: "Low",
    classes: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  medium: {
    label: "Medium",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  high: {
    label: "High",
    classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  critical: {
    label: "Critical",
    classes: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  },
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentProject, getProjectRef } = useProject();
  const {
    openTerminalForContext,
    getExistingSession,
    switchToSession,
    closeSession,
    activeSession,
    isRunning: terminalIsRunning,
  } = useTerminal();

  const [task, setTask] = useState<V2Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Inline description editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  // Set page context for terminal suggested commands
  usePageContext(
    task
      ? { type: "task-detail", id: task.id, title: task.displayKey || task.title }
      : null,
  );

  // Check if terminal is showing this task
  const isTerminalShowingThisTask = activeSession?.contextId === taskId;

  // Check if a Claude session exists (even if terminal tab is closed)
  const hasClaudeSession = useHasClaudeSession("task", task?.id);

  // Check if a terminal tab exists for this task
  const hasTerminalTab = task
    ? !!getExistingSession({
        type: "task" as const,
        id: task.id,
        title: task.title,
      })
    : false;

  // Show "Resume Agent" if either terminal tab or Claude session exists
  const hasExistingSession = hasTerminalTab || hasClaudeSession;

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

  // Fetch acceptance criteria
  const fetchCriteria = useCallback(async () => {
    if (!taskId) return;
    const projectRef = getProjectRef();
    if (!projectRef) {
      setCriteria([]);
      setCriteriaLoading(false);
      return;
    }

    try {
      setCriteriaLoading(true);
      const response = await api.tasks.listTaskAcceptanceCriteria({
        projectRef,
        taskRef: taskId,
      });
      setCriteria((response.data ?? []) as unknown as AcceptanceCriterion[]);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
      setCriteria([]);
    } finally {
      setCriteriaLoading(false);
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

    // Optimistically update local state
    const previousEpicId = task.epicId;
    const newEpicId = newEpicRef === null ? undefined : typeof newEpicRef === "string" ? newEpicRef : undefined;
    setTask({ ...task, epicId: newEpicId });

    try {
      await api.tasks.updateTask({
        projectRef,
        taskRef: task.id,
        updateTaskRequest: {
          epicRef:
            newEpicRef === null
              ? ""
              : typeof newEpicRef === "string"
                ? newEpicRef
                : undefined,
        },
      });
    } catch (err) {
      // Revert on error
      setTask({ ...task, epicId: previousEpicId });
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

  // Save description
  const handleDescriptionSave = async () => {
    if (!task) return;
    const trimmed = editDescription.trim();
    const oldDescription = task.description ?? "";

    // Always exit editing mode
    setEditingDescription(false);

    if (trimmed !== oldDescription) {
      // Optimistically update local state
      setTask({ ...task, description: trimmed || undefined });

      const projectRef = getProjectRef();
      if (!projectRef) return;

      try {
        await api.tasks.updateTask({
          projectRef,
          taskRef: task.id,
          updateTaskRequest: { description: trimmed || "" },
        });
      } catch (err) {
        // Revert on error
        setTask({ ...task, description: oldDescription || undefined });
        console.error("Failed to update description:", err);
        setError(err instanceof Error ? err.message : "Failed to update description");
      }
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditDescription(task?.description ?? "");
      setEditingDescription(false);
    }
    // Ctrl/Cmd + Enter to save
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleDescriptionSave();
    }
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

  // Build context for terminal session
  const buildTerminalContext = useCallback(() => {
    if (!task) return null;
    const initialPrompt = generateTaskPrompt({
      title: task.title,
      displayKey: task.displayKey || task.id,
      status: task.status,
      priority: task.priority,
    });

    return {
      type: "task" as const,
      id: task.id,
      title: task.title,
      displayKey: task.displayKey,
      projectRef: getProjectRef() ?? undefined,
      workingDirectory: currentProject?.localPath,
      initialCommand: "claude",
      initialPrompt,
    };
  }, [task, getProjectRef, currentProject?.localPath]);

  // Resume existing session or create new one
  const handleOpenInTerminal = () => {
    const context = buildTerminalContext();
    if (!context) return;

    const existing = getExistingSession(context);
    if (existing) {
      switchToSession(existing.id);
    } else {
      openTerminalForContext(context);
    }
  };

  // Force launch a new agent (close existing session first)
  const handleLaunchNewAgent = () => {
    const context = buildTerminalContext();
    if (!context) return;

    // Close existing session if any
    const existing = getExistingSession(context);
    if (existing) {
      closeSession(existing.id);
    }
    // Open fresh terminal with forceNew flag to skip Claude session resume
    openTerminalForContext({ ...context, forceNew: true });
  };

  useEffect(() => {
    fetchTask();
    fetchDependencies();
    fetchCriteria();
  }, [fetchTask, fetchDependencies, fetchCriteria]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg
          className="animate-spin w-8 h-8 text-accent-500"
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
        <p className="text-surface-500 mt-2">{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">
          Back
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <div className="text-surface-500 dark:text-surface-400 text-lg">
          Task not found
        </div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">
          Back
        </button>
      </div>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <DetailPageHeader
        backTo="/tasks"
        entityKey={task.displayKey || `T-${task.id}`}
        title={task.title}
        onTitleChange={handleTitleChange}
        status={task.status}
        statusOptions={TASK_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        selectors={
          <EpicSelector
            projectId={0}
            projectRef={getProjectRef() ?? undefined}
            selectedEpicId={task.epicId}
            onChange={handleEpicChange}
          />
        }
        badges={[
          { label: "Priority", value: task.priority },
          ...(task.estimatedDuration ? [{ label: "Estimate", value: `${task.estimatedDuration}h` }] : []),
        ]}
        createdAt={task.createdAt}
        updatedAt={task.updatedAt}
        primaryAction={
          <AIActionButton
            entityType="task"
            entityId={task.id}
            entityTitle={task.title}
            hasExistingSession={hasExistingSession}
            isTerminalActive={isTerminalShowingThisTask && terminalIsRunning}
            onStartWork={handleLaunchNewAgent}
            onContinueWork={hasExistingSession ? handleOpenInTerminal : undefined}
          />
        }
        actions={[
          {
            label: "Refresh",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ),
            onClick: async () => {
              await fetchTask();
              await fetchDependencies();
              await fetchCriteria();
            },
          },
          {
            label: deleting ? "Deleting..." : "Delete Task",
            icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ),
            onClick: handleDelete,
            variant: "danger" as const,
          },
        ]}
        isLoading={loading}
      />

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 overflow-y-auto scrollbar-hidden">
          {/* Summary Section */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">
              Summary
            </h2>
            <div className="space-y-3">
              {/* Priority */}
              <div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Priority</div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.classes}`}>
                  {priorityConfig.label}
                </span>
              </div>

              {/* Epic Link */}
              {task.epicId && (
                <div>
                  <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Epic</div>
                  <Link
                    to={`/epics/${task.epicId}`}
                    className="text-sm text-accent-600 dark:text-accent-400 hover:underline"
                  >
                    {task.epicDisplayKey || task.epicId}
                  </Link>
                </div>
              )}

              {/* Estimate */}
              {task.estimatedDuration && (
                <div>
                  <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Estimate</div>
                  <div className="text-sm text-surface-900 dark:text-white">{task.estimatedDuration}h</div>
                </div>
              )}

              {/* Actual Duration */}
              {task.actualDuration && (
                <div>
                  <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Actual</div>
                  <div className="text-sm text-surface-900 dark:text-white">{task.actualDuration}h</div>
                </div>
              )}

              {/* Requires Approval */}
              <div>
                <div className="text-xs text-surface-500 dark:text-surface-400 mb-1">Approval</div>
                <div className="text-sm text-surface-900 dark:text-white">
                  {task.requiresApproval ? "Required" : "Not required"}
                </div>
              </div>
            </div>
          </div>

          {/* Acceptance Criteria Section */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2.5 bg-surface-100 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Acceptance Criteria
                </h3>
              </div>
              {/* Content */}
              <div className="p-3">
                {criteriaLoading ? (
                  <div className="text-sm text-surface-400 dark:text-surface-500">Loading...</div>
                ) : (
                  <AcceptanceCriteriaList
                    entityType="task"
                    projectRef={getProjectRef() ?? ""}
                    entityRef={task.id}
                    criteria={criteria}
                    onUpdate={fetchCriteria}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dependencies Section */}
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">
              Dependencies
            </h2>
            {dependencies.length === 0 ? (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                No dependencies
              </p>
            ) : (
              <div className="space-y-2">
                {dependencies.map((dep) => (
                  <div
                    key={dep.dependsOnTaskId}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-sm bg-surface-100 dark:bg-surface-800"
                  >
                    <Link
                      to={`/tasks/${dep.dependsOnTaskId}`}
                      className="text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      {dep.dependsOnDisplayKey || dep.dependsOnTaskId}
                    </Link>
                    <button
                      onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                      className="text-surface-400 hover:text-red-500 dark:hover:text-red-400"
                      title="Remove dependency"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PR Link Section */}
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">
              Pull Request
            </h2>
            {task.githubPrUrl ? (
              <button
                onClick={() => {
                  if (task.githubPrUrl) open(task.githubPrUrl);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <svg className="w-4 h-4 text-surface-500" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View Pull Request
              </button>
            ) : (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                No PR linked
              </p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
              Description
            </h2>
            {editingDescription ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDescriptionSave}
                  className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
                >
                  Save
                </button>
                <span className="text-surface-300 dark:text-surface-600">|</span>
                <button
                  onClick={() => {
                    setEditDescription(task.description ?? "");
                    setEditingDescription(false);
                  }}
                  className="text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditDescription(task.description ?? "");
                  setEditingDescription(true);
                }}
                className="text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
              >
                Edit
              </button>
            )}
          </div>
          {/* Content */}
          <div className={`flex-1 px-8 pb-8 ${editingDescription ? 'overflow-hidden' : 'overflow-auto'}`}>
            {editingDescription ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleDescriptionKeyDown}
                placeholder="Enter description (supports Markdown)..."
                className="w-full h-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                autoFocus
              />
            ) : task.description ? (
              <MarkdownRenderer source={task.description} />
            ) : (
              <p className="text-surface-400 dark:text-surface-500 italic">
                No description yet. Click Edit to add one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
