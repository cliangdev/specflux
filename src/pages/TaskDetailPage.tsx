import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { open } from "@tauri-apps/plugin-shell";
import {
  api,
  type Task as V2Task,
  type TaskStatus,
  type TaskDependency,
  type AcceptanceCriteria,
} from "../api";
import { useProject } from "../contexts";
import EpicSelector from "../components/tasks/EpicSelector";
import { DetailPageHeader } from "../components/ui";
import { AIActionButton } from "../components/ui/AIActionButton";
import { AcceptanceCriteriaList } from "../components/ui/AcceptanceCriteriaList";
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import { useTerminal } from "../contexts/TerminalContext";
import { usePageContext } from "../hooks/usePageContext";
import { generateTaskPrompt } from "../services/promptGenerator";

// Task status options for DetailPageHeader
const TASK_STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "COMPLETED", label: "Completed" },
];

// Keyboard handler for inline editing
function handleKeyDown(
  e: React.KeyboardEvent,
  onSave: () => void,
  onCancel: () => void,
) {
  if (e.key === "Escape") {
    onCancel();
  }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    onSave();
  }
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentProject, getProjectRef } = useProject();
  const {
    openTerminalForContext,
    getExistingSession,
    switchToSession,
    activeSession,
    isRunning: terminalIsRunning,
  } = useTerminal();

  // Back navigation - use "from" param if available, otherwise default to /tasks
  const backTo = searchParams.get("from") || "/tasks";

  const [task, setTask] = useState<V2Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Description editing state
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Acceptance criteria state
  const [criteria, setCriteria] = useState<AcceptanceCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(true);

  // Set page context for terminal suggested commands - use displayKey for terminal header
  usePageContext(
    task
      ? { type: "task-detail", id: task.id, title: task.displayKey || task.title }
      : null,
  );

  // Check if terminal is showing this task
  const isTerminalShowingThisTask = activeSession?.contextId === taskId;

  // Check if a session exists for this task (for button text)
  const hasExistingSession = task
    ? !!getExistingSession({
        type: "task" as const,
        id: task.id,
        title: task.title,
      })
    : false;

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
    if (!projectRef) return;

    try {
      setCriteriaLoading(true);
      const response = await api.tasks.listTaskAcceptanceCriteria({
        projectRef,
        taskRef: taskId,
      });
      setCriteria(response.data ?? []);
    } catch (err) {
      console.error("Failed to fetch criteria:", err);
      setCriteria([]);
    } finally {
      setCriteriaLoading(false);
    }
  }, [taskId, getProjectRef]);

  // Handle description save
  const handleDescriptionSave = async () => {
    if (!task) return;

    const trimmed = descriptionValue.trim();
    const oldDescription = task.description || "";

    setEditingDescription(false);

    if (trimmed !== oldDescription) {
      const projectRef = getProjectRef();
      if (!projectRef) return;

      try {
        // JSON Merge Patch: null = clear, value = set, absent = don't change
        // Cast needed because TypeScript types don't include null for nullable fields
        await api.tasks.updateTask({
          projectRef,
          taskRef: task.id,
          updateTaskRequest: { description: (trimmed || null) as string | undefined },
        });
        fetchTask();
      } catch (err) {
        console.error("Failed to update description:", err);
        setDescriptionValue(oldDescription);
      }
    }
  };

  // Update task's epic assignment (optimistic update)
  const handleEpicChange = async (newEpicRef: number | string | null) => {
    if (!task) return;

    const projectRef = getProjectRef();
    if (!projectRef) {
      setError("No project selected");
      return;
    }

    const oldEpicId = task.epicId;
    // JSON Merge Patch: null = clear, value = set, absent = don't change
    const newEpicId = typeof newEpicRef === "string" ? newEpicRef : null;

    // Optimistic update
    setTask({ ...task, epicId: newEpicId ?? undefined });

    try {
      // Cast needed because TypeScript types don't include null for nullable fields
      await api.tasks.updateTask({
        projectRef,
        taskRef: task.id,
        updateTaskRequest: {
          epicRef: newEpicId as string | undefined,
        },
      });
    } catch (err) {
      // Revert on error
      setTask({ ...task, epicId: oldEpicId });
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

  const handleOpenInTerminal = () => {
    if (task) {
      const initialPrompt = generateTaskPrompt({
        title: task.title,
        displayKey: task.displayKey || task.id,
        status: task.status,
        priority: task.priority,
      });

      const context = {
        type: "task" as const,
        id: task.id,
        title: task.title,
        displayKey: task.displayKey,
        projectRef: getProjectRef() ?? undefined,
        workingDirectory: currentProject?.localPath,
        initialCommand: "claude",
        initialPrompt,
      };

      // Check if session already exists - switch to it directly
      const existing = getExistingSession(context);
      if (existing) {
        switchToSession(existing.id);
      } else {
        openTerminalForContext(context);
      }
    }
  };

  useEffect(() => {
    fetchTask();
    fetchDependencies();
    fetchCriteria();
  }, [fetchTask, fetchDependencies, fetchCriteria]);

  // Sync description value with task
  useEffect(() => {
    if (task) {
      setDescriptionValue(task.description || "");
    }
  }, [task?.description]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
      descriptionRef.current.setSelectionRange(
        descriptionRef.current.value.length,
        descriptionRef.current.value.length,
      );
    }
  }, [editingDescription]);

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <DetailPageHeader
        backTo={backTo}
        entityKey={task.displayKey || `T-${task.id}`}
        title={task.title}
        onTitleChange={handleTitleChange}
        status={task.status}
        statusOptions={TASK_STATUS_OPTIONS}
        onStatusChange={handleStatusChange}
        selectors={
          <div className="flex items-center gap-1.5">
            <span className="text-surface-500 dark:text-surface-400">Epic:</span>
            <EpicSelector
              projectId={0}
              projectRef={getProjectRef() ?? undefined}
              selectedEpicId={task.epicId}
              onChange={handleEpicChange}
            />
          </div>
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
            onStartWork={handleOpenInTerminal}
            onContinueWork={hasExistingSession ? handleOpenInTerminal : undefined}
          />
        }
        actions={[
          ...(task.githubPrUrl
            ? [
                {
                  label: "View PR",
                  icon: (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ),
                  onClick: () => {
                    if (task.githubPrUrl) open(task.githubPrUrl);
                  },
                },
              ]
            : []),
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Description - Takes most space */}
        <div className="flex-1 min-h-0 mb-4">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-surface-900 dark:text-white">
                Description
              </h3>
              {!editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                  title="Edit description"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="flex-1 border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 flex flex-col">
                <textarea
                  ref={descriptionRef}
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, handleDescriptionSave, () => {
                      setDescriptionValue(task.description ?? "");
                      setEditingDescription(false);
                    })
                  }
                  placeholder="Add a description..."
                  className="flex-1 w-full p-3 text-sm text-surface-700 dark:text-surface-300 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-accent-500 focus:ring-inset rounded-t-md"
                />
                <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 rounded-b-md">
                  <button
                    onClick={handleDescriptionSave}
                    className="btn btn-primary text-xs py-1 px-2"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setDescriptionValue(task.description ?? "");
                      setEditingDescription(false);
                    }}
                    className="btn btn-secondary text-xs py-1 px-2"
                  >
                    Cancel
                  </button>
                  <span className="text-xs text-surface-400 dark:text-surface-500">
                    Esc to cancel, Ctrl+Enter to save
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800">
                {task.description ? (
                  <MarkdownRenderer
                    source={task.description}
                    className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  />
                ) : (
                  <p className="text-sm text-surface-400 dark:text-surface-500 italic">
                    No description
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom sections - Compact grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Acceptance Criteria */}
          <div>
            <h3 className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">
              Acceptance Criteria
            </h3>
            <div className="p-2 border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 max-h-32 overflow-y-auto">
              {criteriaLoading ? (
                <div className="text-xs text-surface-400">Loading...</div>
              ) : (
                <AcceptanceCriteriaList
                  entityType="task"
                  projectRef={getProjectRef() || ""}
                  entityRef={task.id}
                  criteria={criteria}
                  onUpdate={fetchCriteria}
                />
              )}
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <h3 className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">
              Dependencies
            </h3>
            <div className="p-2 border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-800 max-h-32 overflow-y-auto">
              {dependencies.length === 0 ? (
                <p className="text-xs text-surface-400 dark:text-surface-500 italic">
                  No dependencies
                </p>
              ) : (
                <div className="space-y-1">
                  {dependencies.map((dep) => (
                    <div
                      key={`${dep.taskId}-${dep.dependsOnTaskId}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <Link
                        to={`/tasks/${dep.dependsOnTaskId}`}
                        className="text-surface-700 dark:text-surface-300 hover:text-accent-600 dark:hover:text-accent-400"
                      >
                        {dep.dependsOnDisplayKey}
                      </Link>
                      <button
                        onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                        className="p-0.5 text-surface-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Remove"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
