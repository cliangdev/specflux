import { useState, type FormEvent } from "react";
import { api, type CreateProjectRequest } from "../../api";
import { open } from "@tauri-apps/plugin-dialog";
import { initProjectStructure } from "../../templates";

interface ProjectCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

type PrdOption = "workshop" | "skip";

const PRD_OPTIONS = [
  {
    value: "workshop" as PrdOption,
    label: "Start PRD Workshop",
    description: "Claude will guide you through creating a product spec.",
    recommended: true,
  },
  {
    value: "skip" as PrdOption,
    label: "Skip for now",
    description: "I'll add PRDs later from the PRDs page.",
    recommended: false,
  },
];

/**
 * Generate a project key from the name
 * e.g. "My Awesome Project" -> "MYAWESOME"
 */
function generateProjectKey(name: string): string {
  return (
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 10) || "PROJECT"
  );
}

export default function ProjectCreateModal({
  onClose,
  onCreated,
}: ProjectCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [prdOption, setPrdOption] = useState<PrdOption>("workshop");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (selected && typeof selected === "string") {
        setLocalPath(selected);
      }
    } catch (err) {
      console.error("Failed to open directory picker:", err);
      setError("Failed to open directory picker: " + String(err));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const projectKey = generateProjectKey(name);
      const request: CreateProjectRequest = {
        projectKey,
        name: name.trim(),
        description: description.trim() || undefined,
        localPath: localPath.trim() || undefined,
      };

      await api.projects.createProject({
        createProjectRequest: request,
      });

      // Initialize project structure if localPath is set
      if (localPath.trim()) {
        await initProjectStructure(localPath.trim());
      }

      // Handle post-creation flow based on PRD option
      if (prdOption === "workshop") {
        // TODO (Phase 1C): Navigate to PRD workshop or open terminal with /prd
        console.log("PRD Workshop selected - will be implemented in Phase 1C");
      }

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
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-white transition-colors"
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

            {/* Project Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
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
              {name && (
                <p className="mt-1 text-xs text-surface-500">
                  Project key:{" "}
                  <span className="font-mono">{generateProjectKey(name)}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
              >
                Description <span className="text-surface-400">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what you're building"
                className="input resize-none"
                rows={2}
              />
            </div>

            {/* Local Path */}
            <div>
              <label
                htmlFor="localPath"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
              >
                Project Directory{" "}
                <span className="text-surface-400">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="localPath"
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="px-4 py-2 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-600 transition-colors"
                >
                  Browse
                </button>
              </div>
              <p className="mt-1 text-xs text-surface-500">
                Sets up .specflux/ and .claude/ directories with templates
              </p>
            </div>

            {/* PRD Options */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                After creation
              </label>
              <div className="space-y-2">
                {PRD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      prdOption === option.value
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="prdOption"
                      value={option.value}
                      checked={prdOption === option.value}
                      onChange={(e) =>
                        setPrdOption(e.target.value as PrdOption)
                      }
                      className="mt-1 w-4 h-4 text-accent-600 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 focus:ring-accent-500 focus:ring-offset-white dark:focus:ring-offset-surface-800"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-900 dark:text-white">
                          {option.label}
                        </span>
                        {option.recommended && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
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
