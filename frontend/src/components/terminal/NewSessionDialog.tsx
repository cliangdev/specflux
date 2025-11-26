import { useState, useEffect, type FormEvent } from "react";
import { api, type Task, type Epic } from "../../api";
import type { ContextType, ContextInfo } from "../../contexts/TerminalContext";

interface NewSessionDialogProps {
  projectId: number;
  onClose: () => void;
  onCreated: (context: ContextInfo) => void;
}

const CONTEXT_MODE_OPTIONS: {
  value: ContextType;
  label: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    value: "task",
    label: "Task",
    description: "Work on a specific task with its context",
    enabled: true,
  },
  {
    value: "epic",
    label: "Epic",
    description: "Review epic planning, PRD, and task breakdown",
    enabled: true,
  },
  {
    value: "project",
    label: "Project",
    description: "Coordinate across epics, review project health",
    enabled: true,
  },
];

export default function NewSessionDialog({
  projectId,
  onClose,
  onCreated,
}: NewSessionDialogProps) {
  const [contextMode, setContextMode] = useState<ContextType>("task");
  const [selectedTaskId, setSelectedTaskId] = useState<number | undefined>();
  const [selectedEpicId, setSelectedEpicId] = useState<number | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks for the dropdown
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoadingTasks(true);
        const response = await api.tasks.listTasks({ id: projectId });
        // Filter to tasks that aren't done
        const activeTasks = (response.data ?? []).filter(
          (t) => t.status !== "done",
        );
        setTasks(activeTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks");
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchTasks();
  }, [projectId]);

  // Fetch epics for the dropdown
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        setLoadingEpics(true);
        const response = await api.epics.listEpics({ id: projectId });
        setEpics(response.data ?? []);
      } catch (err) {
        console.error("Failed to fetch epics:", err);
        // Don't show error for epics - they may not exist yet
      } finally {
        setLoadingEpics(false);
      }
    };
    fetchEpics();
  }, [projectId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (contextMode === "task") {
      if (!selectedTaskId) {
        setError("Please select a task");
        return;
      }

      const selectedTask = tasks.find((t) => t.id === selectedTaskId);
      if (selectedTask) {
        onCreated({
          type: "task",
          id: selectedTask.id,
          title: selectedTask.title,
        });
      }
    } else if (contextMode === "epic") {
      if (!selectedEpicId) {
        setError("Please select an epic");
        return;
      }

      const selectedEpic = epics.find((e) => e.id === selectedEpicId);
      if (selectedEpic) {
        onCreated({
          type: "epic",
          id: selectedEpic.id,
          title: selectedEpic.title,
        });
      }
    } else if (contextMode === "project") {
      onCreated({
        type: "project",
        id: projectId,
        title: "Project",
      });
    }
  };

  const canSubmit =
    contextMode === "task"
      ? !!selectedTaskId
      : contextMode === "epic"
        ? !!selectedEpicId
        : contextMode === "project"
          ? true // Project uses current project automatically
          : CONTEXT_MODE_OPTIONS.find((o) => o.value === contextMode)?.enabled;

  const loading = loadingTasks || loadingEpics;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-system-200 dark:border-system-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            New Terminal Session
          </h2>
          <button
            onClick={onClose}
            className="text-system-400 hover:text-system-600 dark:hover:text-white transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Context Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-system-700 dark:text-system-300 mb-2">
                Context Mode
              </label>
              <div className="space-y-2">
                {CONTEXT_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      contextMode === option.value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-system-200 dark:border-system-700 hover:border-system-300 dark:hover:border-system-600"
                    } ${!option.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="contextMode"
                      value={option.value}
                      checked={contextMode === option.value}
                      onChange={(e) =>
                        option.enabled &&
                        setContextMode(e.target.value as ContextType)
                      }
                      disabled={!option.enabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-system-900 dark:text-white">
                          {option.label}
                        </span>
                        {!option.enabled && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-system-100 dark:bg-system-700 text-system-500 dark:text-system-400">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-system-500 dark:text-system-400 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Task Selector (shown when Task mode is selected) */}
            {contextMode === "task" && (
              <div>
                <label
                  htmlFor="task"
                  className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
                >
                  Select Task <span className="text-red-500">*</span>
                </label>
                <select
                  id="task"
                  value={selectedTaskId ?? ""}
                  onChange={(e) =>
                    setSelectedTaskId(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="select"
                  disabled={loadingTasks}
                >
                  <option value="">
                    {loadingTasks ? "Loading tasks..." : "Select a task"}
                  </option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      #{task.id}: {task.title}
                    </option>
                  ))}
                </select>
                {tasks.length === 0 && !loadingTasks && (
                  <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                    No active tasks found. Create a task first.
                  </p>
                )}
              </div>
            )}

            {/* Epic Selector (shown when Epic mode is selected) */}
            {contextMode === "epic" && (
              <div>
                <label
                  htmlFor="epic"
                  className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
                >
                  Select Epic <span className="text-red-500">*</span>
                </label>
                <select
                  id="epic"
                  value={selectedEpicId ?? ""}
                  onChange={(e) =>
                    setSelectedEpicId(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="select"
                  disabled={loadingEpics}
                >
                  <option value="">
                    {loadingEpics ? "Loading epics..." : "Select an epic"}
                  </option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      #{epic.id}: {epic.title}
                    </option>
                  ))}
                </select>
                {epics.length === 0 && !loadingEpics && (
                  <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                    No epics found. Create an epic first.
                  </p>
                )}
                <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                  Claude will review the epic&apos;s PRD and task breakdown.
                </p>
              </div>
            )}

            {/* Project Mode Info */}
            {contextMode === "project" && (
              <div className="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-lg">
                <p className="text-sm text-brand-700 dark:text-brand-300">
                  Claude will analyze the project overview, including all epics,
                  task statistics, and repositories.
                </p>
                <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">
                  Use this mode for cross-epic coordination and project
                  planning.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-system-600 dark:text-system-300 hover:text-system-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open Terminal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
