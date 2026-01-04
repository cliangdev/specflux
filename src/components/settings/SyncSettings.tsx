import { useState, useEffect } from "react";
import {
  connectGitHub,
  disconnectGitHub,
  getGitHubStatus,
  type GitHubConnectionStatus,
} from "../../services/githubConnection";
import { GitHubConnectCard } from "../sync/GitHubConnectCard";
import { ConfirmModal } from "../ui/ConfirmModal";
import { useProject } from "../../contexts";

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
  const { currentProject } = useProject();
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus>({
    isConnected: false,
  });
  const [, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
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

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      await connectGitHub();
      loadGitHubStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to GitHub");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true);
    setError(null);

    try {
      await disconnectGitHub();
      loadGitHubStatus();
      setShowDisconnectConfirm(false);
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
      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
          {error}
        </div>
      )}

      {/* GitHub Connection */}
      <div>
        <label className="block text-sm font-medium mb-2 text-surface-900 dark:text-white">
          GitHub Connection
        </label>
        {githubStatus.isConnected ? (
          <div className="space-y-3">
            {/* Connected User Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
              {githubStatus.avatarUrl && (
                <img
                  src={githubStatus.avatarUrl}
                  alt={githubStatus.username}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                    @{githubStatus.username}
                  </p>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Connected
                  </span>
                </div>
                {githubStatus.connectedAt && (
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Connected on {githubStatus.connectedAt.toLocaleDateString()}
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

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnectClick}
              disabled={disconnecting}
              className="px-4 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect GitHub
            </button>
          </div>
        ) : (
          <GitHubConnectCard
            onConnect={handleConnect}
            projectPath={currentProject?.localPath}
          />
        )}
      </div>

      {/* Auto-Sync Toggle */}
      {githubStatus.isConnected && (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-surface-900 dark:text-white">
                Auto-sync on file changes
              </label>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Automatically commit and push changes when you save files.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
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

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <ConfirmModal
          title="Disconnect GitHub"
          message="Are you sure you want to disconnect GitHub? Your projects will no longer sync."
          confirmLabel={disconnecting ? "Disconnecting..." : "Disconnect"}
          variant="danger"
          isLoading={disconnecting}
          onConfirm={handleDisconnectConfirm}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
      )}
    </div>
  );
}
