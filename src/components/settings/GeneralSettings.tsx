import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import { open } from "@tauri-apps/plugin-dialog";
import {
  initProjectStructure,
  isProjectInitialized,
  syncTemplates,
  getTemplateStatus,
  type TemplateStatus,
  type SyncResult,
} from "../../templates";
import { useProjectHealth } from "../../hooks/useProjectHealth";
import { ProjectHealthPanel } from "./ProjectHealthPanel";

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
  });

  // Template sync state
  const [templateStatuses, setTemplateStatuses] = useState<TemplateStatus[]>(
    [],
  );
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Project health check
  const {
    status: healthStatus,
    items: healthItems,
    loading: healthLoading,
    refresh: refreshHealth,
  } = useProjectHealth(currentProject);

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
          if (projectData.localPath) {
            // Load template status
            await loadTemplateStatus(projectData.localPath);
          }

          setFormData({
            name: projectData.name || "",
            localPath: projectData.localPath || "",
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
        setFormData({
          ...formData,
          localPath: selected,
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

      // Initialize project structure if localPath changed
      if (formData.localPath && formData.localPath !== oldLocalPath) {
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

      // Delete all related entities before deleting the project
      // Order matters: tasks -> epics -> prds -> releases -> repos -> agents -> skills -> mcp servers
      // Use pagination (limit 100 max) to handle large datasets

      // 1. Delete all tasks (paginate through all)
      let hasMoreTasks = true;
      while (hasMoreTasks) {
        const tasksResponse = await api.tasks.listTasks({ projectRef, limit: 100 });
        const tasks = tasksResponse.data ?? [];
        if (tasks.length === 0) {
          hasMoreTasks = false;
        } else {
          for (const task of tasks) {
            await api.tasks.deleteTask({ projectRef, taskRef: task.id });
          }
        }
      }

      // 2. Delete all epics (paginate through all)
      let hasMoreEpics = true;
      while (hasMoreEpics) {
        const epicsResponse = await api.epics.listEpics({ projectRef, limit: 100 });
        const epics = epicsResponse.data ?? [];
        if (epics.length === 0) {
          hasMoreEpics = false;
        } else {
          for (const epic of epics) {
            await api.epics.deleteEpic({ projectRef, epicRef: epic.id });
          }
        }
      }

      // 3. Delete all PRDs (paginate through all)
      let hasMorePrds = true;
      while (hasMorePrds) {
        const prdsResponse = await api.prds.listPrds({ projectRef, limit: 100 });
        const prds = prdsResponse.data ?? [];
        if (prds.length === 0) {
          hasMorePrds = false;
        } else {
          for (const prd of prds) {
            await api.prds.deletePrd({ projectRef, prdRef: prd.id });
          }
        }
      }

      // 4. Delete all releases (paginate through all)
      let hasMoreReleases = true;
      while (hasMoreReleases) {
        const releasesResponse = await api.releases.listReleases({ projectRef, limit: 100 });
        const releases = releasesResponse.data ?? [];
        if (releases.length === 0) {
          hasMoreReleases = false;
        } else {
          for (const release of releases) {
            await api.releases.deleteRelease({ projectRef, releaseRef: release.id });
          }
        }
      }

      // 5. Delete all repositories
      const reposResponse = await api.repositories.listRepositories({ projectRef });
      for (const repo of reposResponse.data ?? []) {
        await api.repositories.deleteRepository({ projectRef, repoRef: repo.id });
      }

      // 6. Delete all agents
      const agentsResponse = await api.agents.listAgents({ projectRef });
      for (const agent of agentsResponse.data ?? []) {
        await api.agents.deleteAgent({ projectRef, agentRef: agent.id });
      }

      // 7. Delete all skills
      const skillsResponse = await api.skills.listSkills({ projectRef });
      for (const skill of skillsResponse.data ?? []) {
        await api.skills.deleteSkill({ projectRef, skillRef: skill.id });
      }

      // 8. Delete all MCP servers
      const mcpResponse = await api.mcpServers.listMcpServers({ projectRef });
      for (const server of mcpResponse.data ?? []) {
        await api.mcpServers.deleteMcpServer({ projectRef, serverRef: server.id });
      }

      // 9. Finally delete the project
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
      <div className="text-surface-500 dark:text-surface-400">
        No project selected
      </div>
    );
  }

  if (loading) {
    return <div className="text-surface-500 dark:text-surface-400">Loading...</div>;
  }

  // Handler for navigating to change local path
  const handleChangeLocalPath = () => {
    // Scroll to local path section or focus the browse button
    const localPathSection = document.getElementById("local-path-section");
    localPathSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium mb-2 text-surface-900 dark:text-white">
          Project Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
          placeholder="My SaaS Platform"
        />
      </div>

      {/* Local Path */}
      <div id="local-path-section">
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-surface-900 dark:text-white">
          Local Path
          <span className="group relative inline-flex">
            <svg
              className="w-4 h-4 text-surface-400 cursor-help"
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
            <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-surface-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              SpecFlux project workspace (stores PRDs, tasks, context files).
              Your code repos are linked separately in the Repositories tab.
            </span>
          </span>
        </label>
        {currentProject.localPath ? (
          <div className="px-3 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-surface-700 dark:text-surface-300 font-mono">
            {formData.localPath}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.localPath}
              onChange={(e) =>
                setFormData({ ...formData, localPath: e.target.value })
              }
              className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
              placeholder="/Users/you/projects/my-project"
            />
            <button
              type="button"
              onClick={handleBrowse}
              className="px-4 py-2 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-600"
            >
              Browse
            </button>
          </div>
        )}
      </div>

      {/* Claude Code Templates */}
      {formData.localPath && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-surface-900 dark:text-white">
                  Claude Code Templates
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
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
                  className="px-3 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white"
                >
                  {showTemplates ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncTemplates(true)}
                  disabled={syncing}
                  className="px-3 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
                >
                  {syncing ? "Syncing..." : "Re-sync All"}
                </button>
              </div>
            </div>
          </div>

          {/* Sync result message */}
          {syncResult && (
            <div className="px-4 py-2 bg-semantic-success/10 border-b border-semantic-success/30 text-xs text-semantic-success">
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
                <span className="text-semantic-error">
                  {" "}
                  Errors: {syncResult.errors.map((e) => e.id).join(", ")}.
                </span>
              )}
            </div>
          )}

          {/* Template list */}
          {showTemplates && templateStatuses.length > 0 && (
            <div className="divide-y divide-surface-100 dark:divide-surface-700">
              {templateStatuses.map((template) => (
                <div
                  key={template.id}
                  className="px-4 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {template.exists ? (
                      <svg
                        className="w-4 h-4 text-semantic-success"
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
                        className="w-4 h-4 text-surface-300 dark:text-surface-600"
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
                      className={`text-sm ${template.exists ? "text-surface-700 dark:text-surface-300" : "text-surface-400 dark:text-surface-500"}`}
                    >
                      {template.description}
                    </span>
                  </div>
                  {!template.exists && (
                    <span className="text-xs text-surface-400 dark:text-surface-500">
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
        <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-semantic-success/10 border border-semantic-success/30 rounded-lg text-sm text-semantic-success">
          Settings saved successfully
        </div>
      )}

      {/* Actions */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name}
          className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Setup Checklist - helpful info, not alarming */}
      <ProjectHealthPanel
        status={healthStatus}
        items={healthItems}
        onRefresh={refreshHealth}
        onChangeLocalPath={handleChangeLocalPath}
        loading={healthLoading}
      />

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-semantic-error/30">
        <h3 className="text-sm font-semibold text-semantic-error uppercase tracking-wider mb-4">
          Danger Zone
        </h3>
        <div className="border border-semantic-error/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-surface-900 dark:text-white">
                Delete this project
              </h4>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Once deleted, the project and all its data will be permanently removed.
              </p>
            </div>
            <button
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 bg-semantic-error hover:bg-red-700 text-white text-sm font-medium rounded-lg"
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
          <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                Delete Project
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                This action cannot be undone. This will permanently delete the{" "}
                <span className="font-semibold text-surface-900 dark:text-white">
                  {currentProject.name}
                </span>{" "}
                project and all of its data including epics, tasks, and settings.
              </p>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Please type{" "}
                  <span className="font-mono bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded text-surface-900 dark:text-white">
                    {currentProject.name}
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type project name here"
                  className="w-full bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-sm focus:border-semantic-error focus:ring-1 focus:ring-semantic-error outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
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
                className="px-4 py-2 bg-semantic-error hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
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
