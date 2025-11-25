import { useState, useEffect, type FormEvent } from "react";
import { api, type Task, type TaskDependency } from "../../api";

interface AddDependencyModalProps {
  taskId: number;
  projectId: number;
  existingDependencyIds: number[]; // IDs of tasks already in dependencies
  onClose: () => void;
  onAdded: () => void;
}

export default function AddDependencyModal({
  taskId,
  projectId,
  existingDependencyIds,
  onClose,
  onAdded,
}: AddDependencyModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch available tasks from the project
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await api.tasks.listTasks({ id: projectId });
        // Filter out:
        // 1. Current task (can't depend on itself)
        // 2. Tasks already in dependencies
        // 3. Completed tasks (approved/done) - typically don't need to wait on these
        const availableTasks = (response.data ?? []).filter(
          (t) => t.id !== taskId && !existingDependencyIds.includes(t.id),
        );
        setTasks(availableTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [projectId, taskId, existingDependencyIds]);

  // Filter tasks by search query
  const filteredTasks = searchQuery
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toString().includes(searchQuery),
      )
    : tasks;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedTaskId) {
      setError("Please select a task");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.tasks.addTaskDependency({
        id: taskId,
        addTaskDependencyRequest: { dependsOnTaskId: selectedTaskId },
      });

      onAdded();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add dependency";
      // Check for specific error messages
      if (message.includes("circular")) {
        setError("Cannot add: this would create a circular dependency");
      } else if (message.includes("already exists")) {
        setError("This dependency already exists");
      } else {
        setError(message);
      }
      console.error("Failed to add dependency:", err);
    } finally {
      setSubmitting(false);
    }
  };

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
            Add Dependency
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

            <p className="text-sm text-system-600 dark:text-system-400">
              Select a task that must be completed before this task can start.
            </p>

            {/* Search Input */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-system-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Task List */}
            <div className="max-h-64 overflow-y-auto border border-system-200 dark:border-system-700 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-system-500">
                  Loading tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-center text-system-500">
                  {searchQuery
                    ? "No tasks match your search"
                    : "No available tasks to add as dependencies"}
                </div>
              ) : (
                <div className="divide-y divide-system-200 dark:divide-system-700">
                  {filteredTasks.map((t) => (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        selectedTaskId === t.id
                          ? "bg-brand-50 dark:bg-brand-900/20"
                          : "hover:bg-system-50 dark:hover:bg-system-700/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="dependencyTask"
                        value={t.id}
                        checked={selectedTaskId === t.id}
                        onChange={() => setSelectedTaskId(t.id)}
                        className="text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-xs font-mono text-system-500 dark:text-system-400">
                        #{t.id}
                      </span>
                      <span className="flex-1 text-sm text-system-700 dark:text-system-200 truncate">
                        {t.title}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded ${
                          t.status === "done" || t.status === "approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : t.status === "in_progress"
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-system-600 dark:text-system-300 hover:text-system-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTaskId}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              Add Dependency
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
