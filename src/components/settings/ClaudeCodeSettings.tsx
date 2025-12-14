import { useState, useEffect, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

/**
 * Claude Code settings structure matching .claude/settings.json schema
 */
interface ClaudeSettings {
  permissions: {
    allow: string[];
    deny: string[];
  };
  sandbox?: {
    enabled: boolean;
    autoAllowBashIfSandboxed: boolean;
  };
}

type PermissionMode = "default" | "acceptEdits" | "plan";

/**
 * Permission profile types for quick setup
 */
type ProfileType = "frontend" | "backend" | "fullstack" | "minimal";

interface PermissionProfile {
  name: string;
  description: string;
  commands: string[];
  deniedPaths: string[];
}

/**
 * Pre-configured permission profiles for different project types
 */
const PERMISSION_PROFILES: Record<ProfileType, PermissionProfile> = {
  frontend: {
    name: "Frontend",
    description: "React, Vue, Angular, and web development",
    commands: [
      "Bash(npm:*)",
      "Bash(yarn:*)",
      "Bash(pnpm:*)",
      "Bash(vite:*)",
      "Bash(webpack:*)",
      "Bash(eslint:*)",
      "Bash(prettier:*)",
      "Bash(tsc:*)",
      "Bash(vitest:*)",
      "Bash(jest:*)",
      "Bash(git:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(cat:*)",
    ],
    deniedPaths: [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
    ],
  },
  backend: {
    name: "Backend",
    description: "Java, Python, Rust, Go backend services",
    commands: [
      "Bash(mvn:*)",
      "Bash(./mvnw:*)",
      "Bash(gradle:*)",
      "Bash(./gradlew:*)",
      "Bash(python:*)",
      "Bash(pip:*)",
      "Bash(cargo:*)",
      "Bash(go:*)",
      "Bash(npm:*)",
      "Bash(node:*)",
      "Bash(git:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(cat:*)",
    ],
    deniedPaths: [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./**/credentials.json)",
      "Read(./**/application-prod.yml)",
    ],
  },
  fullstack: {
    name: "Fullstack",
    description: "Full stack with Docker and containers",
    commands: [
      "Bash(npm:*)",
      "Bash(yarn:*)",
      "Bash(mvn:*)",
      "Bash(./mvnw:*)",
      "Bash(docker:*)",
      "Bash(docker-compose:*)",
      "Bash(make:*)",
      "Bash(git:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(cat:*)",
      "Bash(./run.sh:*)",
    ],
    deniedPaths: [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
    ],
  },
  minimal: {
    name: "Minimal",
    description: "Read-only basics, most restrictive",
    commands: [
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
    ],
    deniedPaths: [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./**/credentials.json)",
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
    ],
  },
};

const DEFAULT_SETTINGS: ClaudeSettings = {
  permissions: {
    allow: [],
    deny: [],
  },
  sandbox: {
    enabled: true,
    autoAllowBashIfSandboxed: true,
  },
};

export function ClaudeCodeSettings() {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Settings state
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [sandboxEnabled, setSandboxEnabled] = useState(true);
  const [autoAllowBash, setAutoAllowBash] = useState(true);
  const [allowedCommands, setAllowedCommands] = useState<string[]>([]);
  const [deniedPaths, setDeniedPaths] = useState<string[]>([]);

  // Input state for adding new items
  const [newCommand, setNewCommand] = useState("");
  const [newDeniedPath, setNewDeniedPath] = useState("");

  // Apply a permission profile
  const handleApplyProfile = (profileType: ProfileType) => {
    const profile = PERMISSION_PROFILES[profileType];

    // Merge profile commands with existing (avoiding duplicates)
    const mergedCommands = [...new Set([...allowedCommands, ...profile.commands])];
    const mergedDeniedPaths = [...new Set([...deniedPaths, ...profile.deniedPaths])];

    setAllowedCommands(mergedCommands);
    setDeniedPaths(mergedDeniedPaths);
  };

  // Load settings from .claude/settings.json
  const loadSettings = useCallback(async () => {
    if (!currentProject?.localPath) {
      setLoading(false);
      return;
    }

    try {
      const settingsPath = await join(currentProject.localPath, ".claude", "settings.json");
      const fileExists = await exists(settingsPath);

      if (fileExists) {
        const content = await readTextFile(settingsPath);
        const settings: ClaudeSettings = JSON.parse(content);

        setAllowedCommands(settings.permissions?.allow || []);
        setDeniedPaths(settings.permissions?.deny || []);
        setSandboxEnabled(settings.sandbox?.enabled ?? true);
        setAutoAllowBash(settings.sandbox?.autoAllowBashIfSandboxed ?? true);
      } else {
        // Use defaults
        setAllowedCommands(DEFAULT_SETTINGS.permissions.allow);
        setDeniedPaths(DEFAULT_SETTINGS.permissions.deny);
        setSandboxEnabled(DEFAULT_SETTINGS.sandbox?.enabled ?? true);
        setAutoAllowBash(DEFAULT_SETTINGS.sandbox?.autoAllowBashIfSandboxed ?? true);
      }
    } catch (err) {
      console.error("Failed to load Claude settings:", err);
      setError("Failed to load settings: " + String(err));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.localPath]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings to .claude/settings.json
  const handleSave = async () => {
    if (!currentProject?.localPath) {
      setError("No project path configured");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const settings: ClaudeSettings = {
        permissions: {
          allow: allowedCommands,
          deny: deniedPaths,
        },
        sandbox: {
          enabled: sandboxEnabled,
          autoAllowBashIfSandboxed: autoAllowBash,
        },
      };

      const settingsPath = await join(currentProject.localPath, ".claude", "settings.json");
      await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save Claude settings:", err);
      setError("Failed to save settings: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  // Add new allowed command
  const handleAddCommand = () => {
    const trimmed = newCommand.trim();
    if (trimmed && !allowedCommands.includes(trimmed)) {
      setAllowedCommands([...allowedCommands, trimmed]);
      setNewCommand("");
    }
  };

  // Remove allowed command
  const handleRemoveCommand = (cmd: string) => {
    setAllowedCommands(allowedCommands.filter((c) => c !== cmd));
  };

  // Add new denied path
  const handleAddDeniedPath = () => {
    const trimmed = newDeniedPath.trim();
    if (trimmed && !deniedPaths.includes(trimmed)) {
      setDeniedPaths([...deniedPaths, trimmed]);
      setNewDeniedPath("");
    }
  };

  // Remove denied path
  const handleRemoveDeniedPath = (path: string) => {
    setDeniedPaths(deniedPaths.filter((p) => p !== path));
  };

  if (!currentProject) {
    return (
      <div className="text-surface-500 dark:text-surface-400">
        No project selected
      </div>
    );
  }

  if (!currentProject.localPath) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Local path required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Configure a local path in General settings to manage Claude Code security settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-surface-500 dark:text-surface-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-surface-600 dark:text-surface-400">
        Configure Claude Code permissions and security settings for this project.
        These settings are saved to <code className="px-1 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-xs font-mono">.claude/settings.json</code>.
      </p>

      {/* Permission Mode */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Permission Mode
          </h3>
        </div>
        <div className="p-4">
          <select
            value={permissionMode}
            onChange={(e) => setPermissionMode(e.target.value as PermissionMode)}
            className="w-full max-w-xs bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
          >
            <option value="default">Default - Prompts for each tool</option>
            <option value="acceptEdits">Accept Edits - Auto-accept file changes</option>
            <option value="plan">Plan Mode - Read-only, no modifications</option>
          </select>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
            Controls how Claude Code requests permission for operations.
          </p>
        </div>
      </div>

      {/* Sandbox Settings */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Sandbox
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sandboxEnabled}
              onChange={(e) => setSandboxEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-accent-600 focus:ring-accent-500"
            />
            <div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">
                Enable sandbox isolation
              </span>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Restricts file writes to project directory (macOS/Linux only)
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAllowBash}
              onChange={(e) => setAutoAllowBash(e.target.checked)}
              disabled={!sandboxEnabled}
              className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-accent-600 focus:ring-accent-500 disabled:opacity-50"
            />
            <div>
              <span className={`text-sm font-medium ${sandboxEnabled ? 'text-surface-900 dark:text-white' : 'text-surface-400 dark:text-surface-500'}`}>
                Auto-allow bash commands when sandboxed
              </span>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Skip bash command prompts inside sandbox
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Quick Profiles */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Quick Profiles
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Apply pre-configured permission sets for common project types.
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(PERMISSION_PROFILES) as [ProfileType, PermissionProfile][]).map(
              ([type, profile]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleApplyProfile(type)}
                  className="flex flex-col items-start p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    {profile.name}
                  </span>
                  <span className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {profile.description}
                  </span>
                </button>
              )
            )}
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-3">
            Profiles are merged with existing settings. Click Save to apply changes.
          </p>
        </div>
      </div>

      {/* Allowed Commands */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Allowed Commands
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Bash commands that are pre-approved. Use <code className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded">:*</code> for prefix matching.
          </p>
        </div>
        <div className="p-4">
          {/* Command list */}
          {allowedCommands.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {allowedCommands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
                >
                  <code className="text-xs font-mono text-surface-700 dark:text-surface-300 truncate">
                    {cmd}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleRemoveCommand(cmd)}
                    className="ml-2 text-surface-400 hover:text-semantic-error flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400 dark:text-surface-500 mb-4">
              No allowed commands configured
            </p>
          )}

          {/* Add command input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCommand()}
              placeholder="Bash(npm run:*)"
              className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleAddCommand}
              disabled={!newCommand.trim()}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Denied Paths */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-900 dark:text-white">
            Denied Paths
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            File paths that Claude cannot read. Use <code className="px-1 py-0.5 bg-surface-100 dark:bg-surface-700 rounded">**</code> for glob patterns.
          </p>
        </div>
        <div className="p-4">
          {/* Path list */}
          {deniedPaths.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {deniedPaths.map((path, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
                >
                  <code className="text-xs font-mono text-surface-700 dark:text-surface-300 truncate">
                    {path}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeniedPath(path)}
                    className="ml-2 text-surface-400 hover:text-semantic-error flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400 dark:text-surface-500 mb-4">
              No denied paths configured
            </p>
          )}

          {/* Add path input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newDeniedPath}
              onChange={(e) => setNewDeniedPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDeniedPath()}
              placeholder="Read(./.env)"
              className="flex-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none font-mono"
            />
            <button
              type="button"
              onClick={handleAddDeniedPath}
              disabled={!newDeniedPath.trim()}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>

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

      {/* Save button */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
