import { useState, type FormEvent } from "react";
import { api, type CreateProjectRequest } from "../../api";

interface ProjectCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const WORKFLOW_OPTIONS = [
  {
    value: "startup-fast",
    label: "Startup Fast",
    description: "Planning + Implementation. Perfect for MVPs.",
  },
  {
    value: "design-first",
    label: "Design First",
    description: "Discovery + Design + Planning + Implementation.",
  },
  {
    value: "full-lifecycle",
    label: "Full Lifecycle",
    description: "All phases including testing, docs, security.",
  },
];

export default function ProjectCreateModal({
  onClose,
  onCreated,
}: ProjectCreateModalProps) {
  const [name, setName] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [workflowTemplate, setWorkflowTemplate] = useState("startup-fast");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!localPath.trim()) {
      setError("Local path is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: CreateProjectRequest = {
        name: name.trim(),
        localPath: localPath.trim(),
        workflowTemplate:
          workflowTemplate as CreateProjectRequest["workflowTemplate"],
      };

      await api.projects.createProject({
        createProjectRequest: request,
      });

      onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create project";
      setError(message);
      console.error("Failed to create project:", err);
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
      <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Create New Project
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
                htmlFor="name"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                className="input"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="localPath"
                className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1"
              >
                Local Path <span className="text-red-500">*</span>
              </label>
              <input
                id="localPath"
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="/Users/you/projects/my-project"
                className="input"
              />
              <p className="mt-1 text-xs text-system-500">
                The directory where your project files are located
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-system-700 dark:text-system-300 mb-2">
                Workflow Template
              </label>
              <div className="space-y-2">
                {WORKFLOW_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      workflowTemplate === option.value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-system-200 dark:border-system-700 hover:border-system-300 dark:hover:border-system-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="workflowTemplate"
                      value={option.value}
                      checked={workflowTemplate === option.value}
                      onChange={(e) => setWorkflowTemplate(e.target.value)}
                      className="mt-1 w-4 h-4 text-brand-600 border-system-300 dark:border-system-600 bg-white dark:bg-system-900 focus:ring-brand-500 focus:ring-offset-white dark:focus:ring-offset-system-800"
                    />
                    <div>
                      <div className="text-sm font-medium text-system-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-xs text-system-500 dark:text-system-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
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
              disabled={submitting || !name.trim() || !localPath.trim()}
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
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
