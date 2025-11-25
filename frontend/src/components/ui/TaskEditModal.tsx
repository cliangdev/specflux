import { useState, useEffect, type FormEvent } from "react";
import {
  api,
  type Task,
  type Epic,
  type Repository,
  type UpdateTaskRequest,
} from "../../api";

interface TaskEditModalProps {
  task: Task;
  projectId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "done", label: "Done" },
];

export default function TaskEditModal({
  task,
  projectId,
  onClose,
  onUpdated,
}: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [epicId, setEpicId] = useState<number | undefined>(
    task.epicId ?? undefined,
  );
  const [status, setStatus] = useState(task.status);
  const [repoName, setRepoName] = useState(task.repoName ?? "");
  const [requiresApproval, setRequiresApproval] = useState(
    task.requiresApproval,
  );
  const [estimatedDuration, setEstimatedDuration] = useState<string>(
    task.estimatedDuration?.toString() ?? "",
  );

  const [epics, setEpics] = useState<Epic[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch epics and repositories for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [epicsResponse, reposResponse] = await Promise.all([
          api.epics.listEpics({ id: projectId }),
          api.repositories.listRepositories({ id: projectId }),
        ]);
        setEpics(epicsResponse.data ?? []);
        setRepositories(reposResponse.data ?? []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: UpdateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        epicId: epicId,
        status: status as UpdateTaskRequest["status"],
        repoName: repoName || undefined,
        requiresApproval,
        estimatedDuration: estimatedDuration
          ? parseInt(estimatedDuration, 10)
          : undefined,
      };

      await api.tasks.updateTask({
        id: task.id,
        updateTaskRequest: request,
      });

      onUpdated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update task";
      setError(message);
      console.error("Failed to update task:", err);
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
      <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700 sticky top-0 bg-white dark:bg-system-800">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Edit Task
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

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                className="input"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="select"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Epic */}
            <div>
              <label
                htmlFor="epic"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Epic
              </label>
              <select
                id="epic"
                value={epicId ?? ""}
                onChange={(e) =>
                  setEpicId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="select"
                disabled={loadingData}
              >
                <option value="">No Epic</option>
                {epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Repository */}
            <div>
              <label
                htmlFor="repo"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Repository
              </label>
              <select
                id="repo"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="select"
                disabled={loadingData}
              >
                <option value="">No Repository</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.name}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Duration */}
            <div>
              <label
                htmlFor="estimatedDuration"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Estimated Duration (minutes)
              </label>
              <input
                id="estimatedDuration"
                type="number"
                min="0"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="e.g., 60"
                className="input"
              />
            </div>

            {/* Requires Approval */}
            <div className="flex items-center gap-3">
              <input
                id="requiresApproval"
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-4 h-4 rounded border-system-300 dark:border-system-600 text-brand-600 focus:ring-brand-500 dark:bg-system-700"
              />
              <label
                htmlFor="requiresApproval"
                className="text-sm font-medium text-system-700 dark:text-system-300"
              >
                Requires approval before completion
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700 sticky bottom-0 bg-white dark:bg-system-800">
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
              disabled={submitting || !title.trim()}
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
