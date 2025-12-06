import { useState, useEffect, type FormEvent } from "react";
import {
  api,
  getApiErrorMessage,
  type CreateTaskRequest,
  type Epic,
} from "../../api";
import { AgentSelector } from "../tasks";

interface CriterionInput {
  id: string; // Local ID for key prop
  text: string;
}

interface TaskCreateModalProps {
  projectId: string;
  defaultEpicId?: string;
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
  const [epicId, setEpicId] = useState<string | undefined>(defaultEpicId);
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { id: crypto.randomUUID(), text: "" },
  ]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch epics for the dropdown
  useEffect(() => {
    const fetchEpics = async () => {
      try {
        setLoadingEpics(true);
        const response = await api.epics.listEpics({ projectRef: projectId });
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

    const validCriteria = criteria.filter((c) => c.text.trim());
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (validCriteria.length === 0) {
      setError("At least one acceptance criterion is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        epicRef: epicId,
        assignedToRef: assignedAgentId ?? undefined,
      };

      await api.tasks.createTask({
        projectRef: projectId,
        createTaskRequest: request,
      });

      onCreated();
      onClose();
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to create task");
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
              <label className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1">
                Acceptance Criteria <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {criteria.map((criterion, index) => (
                  <div key={criterion.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={criterion.text}
                      onChange={(e) => {
                        const updated = [...criteria];
                        updated[index] = { ...criterion, text: e.target.value };
                        setCriteria(updated);
                      }}
                      placeholder={`Criterion ${index + 1}`}
                      className="input flex-1"
                    />
                    {criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCriteria(
                            criteria.filter((c) => c.id !== criterion.id),
                          )
                        }
                        className="p-2 text-system-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Remove criterion"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCriteria([
                      ...criteria,
                      { id: crypto.randomUUID(), text: "" },
                    ])
                  }
                  className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                >
                  + Add another criterion
                </button>
              </div>
              <p className="mt-1 text-xs text-system-500 dark:text-system-400">
                Define what needs to be true for this task to be complete
              </p>
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
                onChange={(e) => setEpicId(e.target.value || undefined)}
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
              disabled={
                submitting ||
                !title.trim() ||
                !criteria.some((c) => c.text.trim())
              }
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
