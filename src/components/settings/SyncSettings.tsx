import { useState, useEffect } from "react";
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  type GitHubConnectionStatus,
} from "../../services/githubConnection";
import { GitHubConnectCard } from "../sync/GitHubConnectCard";

interface SyncSettingsProps {
  className?: string;
}

// Icons
const LinkIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export function SyncSettings({ className = "" }: SyncSettingsProps) {
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus>({
    isConnected: false,
  });
  const [, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  // Load GitHub status on mount
  useEffect(() => {
    loadGitHubStatus();
    loadAutoSyncPreference();
  }, []);

  const loadGitHubStatus = () => {
    const status = getGitHubStatus();
    setGithubStatus(status);
  };

  const loadAutoSyncPreference = () => {
    try {
      const stored = localStorage.getItem("specflux:sync:autoSync");
      if (stored !== null) {
        setAutoSync(stored === "true");
      }
    } catch (err) {
      console.warn("Failed to load auto-sync preference:", err);
    }
  };

  const handleConnect = async (_githubUrl: string) => {
    setConnecting(true);
    setError(null);

    try {
      // TODO: Use githubUrl to clone/connect existing repo
      // For now, just connect to GitHub OAuth
      await connectGitHub();
      loadGitHubStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to GitHub");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect GitHub? Your projects will no longer sync."
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      await disconnectGitHub();
      loadGitHubStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect from GitHub"
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    try {
      localStorage.setItem("specflux:sync:autoSync", enabled.toString());
    } catch (err) {
      console.warn("Failed to save auto-sync preference:", err);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
          Sync Settings
        </h2>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Manage GitHub connection and project synchronization preferences.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-semantic-error/10 border border-semantic-error/30 rounded-lg">
          <p className="text-sm text-semantic-error">{error}</p>
        </div>
      )}

      {/* GitHub Connection Status */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-100 dark:bg-surface-800 rounded-lg">
              <LinkIcon className="w-5 h-5 text-surface-600 dark:text-surface-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                GitHub Connection
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {githubStatus.isConnected
                  ? "Your GitHub account is connected"
                  : "Connect your GitHub account to enable sync"}
              </p>
            </div>
          </div>
          {githubStatus.isConnected && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Connected</span>
            </div>
          )}
        </div>

        {/* Connected State */}
        {githubStatus.isConnected ? (
          <div className="space-y-4">
            {/* User Info */}
            {githubStatus.username && (
              <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                {githubStatus.avatarUrl && (
                  <img
                    src={githubStatus.avatarUrl}
                    alt={githubStatus.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    @{githubStatus.username}
                  </p>
                  {githubStatus.connectedAt && (
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Connected on{" "}
                      {githubStatus.connectedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <a
                  href={`https://github.com/${githubStatus.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
                >
                  View Profile
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect GitHub"}
            </button>
          </div>
        ) : (
          /* Not Connected State */
          <GitHubConnectCard onConnect={handleConnect} />
        )}
      </div>

      {/* Auto-Sync Preferences */}
      {githubStatus.isConnected && (
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-1">
                Auto-sync on file changes
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Automatically commit and push changes when you save files in your
                project. Changes are debounced by 5 seconds.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-300 dark:bg-surface-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Additional Info */}
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
              About GitHub Sync
            </p>
            <p className="text-xs text-accent-700 dark:text-accent-300 mt-1">
              SpecFlux uses GitHub to store your project code, PRDs, and
              configuration. Each project can be linked to a GitHub repository for
              automatic version control and collaboration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
