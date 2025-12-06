import { useState, useEffect } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { api } from "../../api";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { initProjectStructure, isProjectInitialized } from "../../templates";

export function GeneralSettings() {
  const { currentProject, refreshProjects, getProjectRef } = useProject();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    localPath: "",
    gitRemote: "",
  });

  // Helper function to detect git remote URL by reading .git/config directly
  // No git CLI required - just file system access
  const detectGitRemote = async (path: string): Promise<string> => {
    try {
      const configPath = `${path}/.git/config`;
      const content = await readTextFile(configPath);
      // Parse [remote "origin"] section and extract url
      const match = content.match(/\[remote "origin"\][^\[]*url\s*=\s*(.+)/);
      return match?.[1]?.trim() || "";
    } catch (err) {
      // .git/config doesn't exist or not readable - not a git repo
      console.debug("No git remote found:", err);
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
  }, [currentProject, getProjectRef]);

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
    </div>
  );
}
