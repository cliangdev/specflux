import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  initProjectStructure,
  isProjectInitialized,
  syncTemplates,
  getTemplateStatus,
  type TemplateStatus,
  type SyncResult,
} from "../../templates";

export function GeneralSettings() {
  const navigate = useNavigate();
  const { currentProject, refreshProjects, getProjectRef } = useProject();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    localPath: "",
    gitRemote: "",
  });

  // Template sync state
  const [templateStatuses, setTemplateStatuses] = useState<TemplateStatus[]>(
    [],
  );
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load template statuses when local path is set
  const loadTemplateStatus = useCallback(async (path: string) => {
    if (!path) {
      setTemplateStatuses([]);
      return;
    }
    try {
      const statuses = await getTemplateStatus(path);
      setTemplateStatuses(statuses);
    } catch (err) {
      console.error("Failed to load template status:", err);
      setTemplateStatuses([]);
    }
  }, []);

  // Handle template sync
  const handleSyncTemplates = async (force: boolean = false) => {
    if (!formData.localPath) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncTemplates(formData.localPath, { force });
      setSyncResult(result);
      await loadTemplateStatus(formData.localPath);

      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (err) {
      setError("Failed to sync templates: " + String(err));
    } finally {
      setSyncing(false);
    }
  };

  // Helper function to detect git remote URL by reading .git/config directly
  // No git CLI required - just file system access
  const detectGitRemote = async (path: string): Promise<string> => {
    try {
      const configPath = `${path}/.git/config`;
      const content = await readTextFile(configPath);
      // Parse [remote "origin"] section and extract url
      const match = content.match(/\[remote "origin"\][^[]*url\s*=\s*(.+)/);
      return match?.[1]?.trim() || "";
    } catch {
      // .git/config doesn't exist or not readable - not a git repo
    }
    return "";
  };

  // Load project data
  useEffect(() => {
    if (currentProject) {
      setLoading(true);
      const projectRef = getProjectRef();
      if (!projectRef) {
        setError("Project reference not available");
        setLoading(false);
        return;
      }
      api.projects
        .getProject({ ref: projectRef })
        .then(async (projectData) => {
          // Auto-detect git remote from localPath
          let detectedGitRemote = "";
          if (projectData.localPath) {
            detectedGitRemote = await detectGitRemote(projectData.localPath);
            // Also load template status
            await loadTemplateStatus(projectData.localPath);
          }

          setFormData({
            name: projectData.name || "",
            localPath: projectData.localPath || "",
            gitRemote: detectedGitRemote,
          });
        })
        .catch((err) => {
          setError("Failed to load project settings");
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [currentProject, getProjectRef, loadTemplateStatus]);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (selected && typeof selected === "string") {
        // Auto-detect git remote from selected path
        const detectedGitRemote = await detectGitRemote(selected);

        setFormData({
          ...formData,
          localPath: selected,
          gitRemote: detectedGitRemote,
        });
      }
    } catch (err) {
      console.error("Failed to open directory picker:", err);
      setError("Failed to open directory picker: " + String(err));
    }
  };

  const handleSave = async () => {
    if (!currentProject) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const projectRef = getProjectRef();
      if (!projectRef) {
        setError("Project reference not available");
        return;
      }
      const oldLocalPath = currentProject.localPath;
      await api.projects.updateProject({
        ref: projectRef,
        updateProjectRequest: {
          name: formData.name,
          localPath: formData.localPath || undefined,
        },
      });

      // Re-detect git remote if localPath changed
      if (formData.localPath && formData.localPath !== oldLocalPath) {
        const detectedGitRemote = await detectGitRemote(formData.localPath);
        setFormData({
          ...formData,
          gitRemote: detectedGitRemote,
        });

        // Initialize project structure if not already done
        const initialized = await isProjectInitialized(formData.localPath);
        if (!initialized) {
          await initProjectStructure(formData.localPath);
        }
      }

      setSuccess(true);
      await refreshProjects();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save settings");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProject) return;

    // Case-insensitive comparison
    if (deleteConfirmText.toLowerCase() !== currentProject.name.toLowerCase()) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const projectRef = getProjectRef();
      if (!projectRef) {
        setError("Project reference not available");
        return;
      }

      await api.projects.deleteProject({ ref: projectRef });

      // Close modal and navigate away
      setShowDeleteModal(false);
      await refreshProjects();
      navigate("/");
    } catch (err) {
      setError("Failed to delete project: " + String(err));
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Project Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          placeholder="My SaaS Platform"
        />
      </div>

      {/* Local Path (editable with browse button) */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Local Path
          <span className="group relative inline-flex">
            <svg
              className="w-4 h-4 text-gray-400 cursor-help"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              SpecFlux project workspace (stores PRDs, tasks, context files).
              Your code repos are linked separately in the Repositories tab.
            </span>
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.localPath}
            onChange={(e) =>
              setFormData({ ...formData, localPath: e.target.value })
            }
            className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            placeholder="/Users/you/projects/my-project"
          />
          <button
            type="button"
            onClick={handleBrowse}
            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            Browse
          </button>
        </div>
      </div>

      {/* Git URL (read-only, auto-detected) */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Git URL
          <span className="group relative inline-flex">
            <svg
              className="w-4 h-4 text-gray-400 cursor-help"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Recommended: Initialize git in this directory to version control
              PRDs and project specs.
            </span>
          </span>
        </label>
        <div className="px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-sm text-gray-600 dark:text-gray-400 min-h-[38px] flex items-center break-all font-mono">
          {formData.gitRemote || (
            <span className="text-gray-400 dark:text-gray-500 font-sans">
              Not configured
            </span>
          )}
        </div>
      </div>

      {/* Claude Code Templates */}
      {formData.localPath && (
        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Claude Code Templates
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {templateStatuses.length > 0 ? (
                    <>
                      {templateStatuses.filter((t) => t.exists).length}/
                      {templateStatuses.length} templates synced
                    </>
                  ) : (
                    "Loading..."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {showTemplates ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncTemplates(true)}
                  disabled={syncing}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium rounded"
                >
                  {syncing ? "Syncing..." : "Re-sync All"}
                </button>
              </div>
            </div>
          </div>

          {/* Sync result message */}
          {syncResult && (
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              {syncResult.created.length > 0 && (
                <span>Created: {syncResult.created.join(", ")}. </span>
              )}
              {syncResult.updated.length > 0 && (
                <span>Updated: {syncResult.updated.join(", ")}. </span>
              )}
              {syncResult.skipped.length > 0 && (
                <span>
                  Skipped (already exist): {syncResult.skipped.join(", ")}.
                </span>
              )}
              {syncResult.errors.length > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {" "}
                  Errors: {syncResult.errors.map((e) => e.id).join(", ")}.
                </span>
              )}
            </div>
          )}

          {/* Template list */}
          {showTemplates && templateStatuses.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {templateStatuses.map((template) => (
                <div
                  key={template.id}
                  className="px-4 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {template.exists ? (
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-gray-300 dark:text-gray-600"
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
                    )}
                    <span
                      className={`text-sm ${template.exists ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      {template.description}
                    </span>
                  </div>
                  {!template.exists && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      missing
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-200">
          Settings saved successfully
        </div>
      )}

      {/* Actions */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-red-200 dark:border-red-900/50">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">
          Danger Zone
        </h3>
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Delete this project
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Once deleted, the project and all its data will be permanently removed.
              </p>
            </div>
            <button
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Project
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This action cannot be undone. This will permanently delete the{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currentProject.name}
                </span>{" "}
                project and all of its data including epics, tasks, and settings.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Please type{" "}
                  <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-900 dark:text-white">
                    {currentProject.name}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type project name here"
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  deleting ||
                  deleteConfirmText.toLowerCase() !== currentProject.name.toLowerCase()
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded"
              >
                {deleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
