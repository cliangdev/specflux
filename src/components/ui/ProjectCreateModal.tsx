import { useState, useEffect, type FormEvent } from "react";
import { api, type CreateProjectRequest } from "../../api";
import { open } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { initProjectStructure } from "../../templates";
import { setLocalProjectPath } from "../../services/localProjectSettings";
import {
  getStoredWorkspacePath,
  getDefaultWorkspacePath,
} from "../../services/workspacePreferences";

interface ProjectCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

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
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspace path on mount
  useEffect(() => {
    const loadWorkspacePath = async () => {
      let path = getStoredWorkspacePath();
      if (!path) {
        path = await getDefaultWorkspacePath();
      }
      setWorkspacePath(path);
    };
    loadWorkspacePath();
  }, []);

  // Auto-populate project directory when name changes
  useEffect(() => {
    const computePath = async () => {
      if (workspacePath && name.trim()) {
        const dirName = name.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
        const computedPath = await join(workspacePath, dirName);
        setLocalPath(computedPath);
      } else if (!name.trim()) {
        setLocalPath("");
      }
    };
    computePath();
  }, [workspacePath, name]);

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
        // localPath is stored locally per-user, not in backend
      };

      const createdProject = await api.projects.createProject({
        createProjectRequest: request,
      });

      if (localPath.trim() && createdProject.id) {
        setLocalProjectPath(createdProject.id, localPath.trim());
        await initProjectStructure(localPath.trim());
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
                Project Directory
              </label>
              <div className="flex gap-2">
                <input
                  id="localPath"
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder={workspacePath ? `${workspacePath}/PROJECTKEY` : "/path/to/your/project"}
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
                {localPath
                  ? "Sets up .specflux/ and .claude/ directories with templates"
                  : "Enter a project name to auto-generate the directory path"}
              </p>
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
