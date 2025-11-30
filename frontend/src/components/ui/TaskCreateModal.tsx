import { useState, useEffect, type FormEvent } from "react";
import { api, type CreateTaskRequest, type Epic, type Agent } from "../../api";
import { AgentSelector } from "../tasks";

interface TaskCreateModalProps {
  projectId: number;
  defaultEpicId?: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function TaskCreateModal({
  projectId,
  defaultEpicId,
  onClose,
  onCreated,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [epicId, setEpicId] = useState<number | undefined>(defaultEpicId);
  const [assignedAgentId, setAssignedAgentId] = useState<number | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch epics for the dropdown
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        setLoadingEpics(true);
        const response = await api.epics.listEpics({ id: projectId });
        setEpics(response.data ?? []);
      } catch (err) {
        console.error("Failed to fetch epics:", err);
      } finally {
        setLoadingEpics(false);
      }
    };
    fetchEpics();
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

      const request: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        epicId: epicId,
        assignedAgentId: assignedAgentId ?? undefined,
        executorType: assignedAgentId ? "agent" : undefined,
      };

      await api.tasks.createTask({
        id: projectId,
        createTaskRequest: request,
      });

      onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create task";
      setError(message);
      console.error("Failed to create task:", err);
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
            Create Task
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
                disabled={loadingEpics}
              >
                <option value="">No Epic</option>
                {epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                Optional - group this task under an epic
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1">
                Assigned Agent
              </label>
              <AgentSelector
                projectId={projectId}
                selectedAgentId={assignedAgentId}
                onChange={(agentId) => setAssignedAgentId(agentId)}
                variant="dropdown"
              />
              <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                Optional - assign an AI agent to execute this task
              </p>
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
