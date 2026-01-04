import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import {
  getDefaultWorkspacePath,
  loadWorkspaceConfig,
  initializeWorkspace,
  getStoredWorkspacePath,
  storeWorkspacePath,
  type WorkspaceConfig,
} from "../../services/workspacePreferences";

interface WorkspaceSetupProps {
  /** Whether to show the modal */
  isOpen: boolean;
  /** Callback when workspace is configured */
  onConfigured: (workspacePath: string) => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** Whether this is first-time setup (shows different messaging) */
  isFirstTime?: boolean;
}

export function WorkspaceSetup({
  isOpen,
  onConfigured,
  onClose,
  isFirstTime = true,
}: WorkspaceSetupProps) {
  const [workspacePath, setWorkspacePath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing workspace configuration or default
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        // First check if we have a stored workspace path
        const storedPath = getStoredWorkspacePath();
        if (storedPath) {
          const config = await loadWorkspaceConfig(storedPath);
          if (config) {
            setWorkspacePath(config.workspacePath);
            setLoading(false);
            return;
          }
        }

        // Otherwise use default
        const defaultPath = await getDefaultWorkspacePath();
        setWorkspacePath(defaultPath);
      } catch (err) {
        console.error("Failed to load workspace config:", err);
        setError("Failed to load workspace configuration");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Workspace Directory",
      });

      if (selected && typeof selected === "string") {
        setWorkspacePath(selected);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to open directory picker:", err);
      setError("Failed to open directory picker");
    }
  };

  const handleSave = async () => {
    if (!workspacePath.trim()) {
      setError("Workspace path is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Ensure the workspace directory exists
      const pathExists = await exists(workspacePath);
      if (!pathExists) {
        await mkdir(workspacePath, { recursive: true });
      }

      // Initialize or update workspace configuration
      const config: WorkspaceConfig = await initializeWorkspace(workspacePath);

      // Store the path for future sessions
      storeWorkspacePath(config.workspacePath);

      // Notify parent component
      onConfigured(config.workspacePath);
      onClose();
    } catch (err) {
      console.error("Failed to configure workspace:", err);
      setError(
        err instanceof Error ? err.message : "Failed to configure workspace"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isFirstTime ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-surface-200 dark:border-surface-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            {isFirstTime ? "Configure Workspace" : "Change Workspace"}
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {isFirstTime
              ? "Choose where to store your SpecFlux projects and workspace files."
              : "Update your workspace location."}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
                Loading...
              </p>
            </div>
          ) : (
            <>
              {/* Info Box */}
              <div className="p-4 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5"
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
                  <div className="flex-1">
                    <p className="text-sm font-medium text-accent-800 dark:text-accent-200">
                      What is a workspace?
                    </p>
                    <p className="text-xs text-accent-700 dark:text-accent-300 mt-1">
                      Your workspace is where SpecFlux stores project data, PRDs,
                      epics, tasks, and Claude Code configuration files. Each project
                      you create will have its own subdirectory here.
                    </p>
                  </div>
                </div>
              </div>

              {/* Workspace Path Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-surface-900 dark:text-white">
                  Workspace Directory
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                    className="flex-1 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none font-mono"
                    placeholder="/Users/you/SpecFlux"
                  />
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="px-4 py-2 bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-600"
                  >
                    Browse
                  </button>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                  Default: {workspacePath || "Loading..."}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
                  {error}
                </div>
              )}

              {/* Example Structure */}
              <div className="p-4 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Example structure:
                </p>
                <div className="text-xs font-mono text-surface-600 dark:text-surface-400 space-y-1">
                  <div>{workspacePath || "~/SpecFlux"}/</div>
                  <div className="pl-4">.specflux-workspace/</div>
                  <div className="pl-8">config.json</div>
                  <div className="pl-4">my-project/</div>
                  <div className="pl-8">.specflux/</div>
                  <div className="pl-8">prds/</div>
                  <div className="pl-8">code-repo/</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
          {!isFirstTime && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !workspacePath.trim()}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
          >
            {saving ? "Configuring..." : isFirstTime ? "Get Started" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
