import { useState, useEffect } from "react";
import { Command } from "@tauri-apps/plugin-shell";

interface GitHubConnectCardProps {
  onConnect: () => Promise<void>;
  projectPath?: string;
  className?: string;
}

// GitHub icon
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    stroke="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// Check circle icon
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

// Arrow path icon
const ArrowPathIcon = ({ className }: { className?: string }) => (
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
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

// Cloud arrow up icon
const CloudArrowUpIcon = ({ className }: { className?: string }) => (
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
      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
    />
  </svg>
);

// Shield check icon
const ShieldCheckIcon = ({ className }: { className?: string }) => (
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
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

// Link icon
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

const benefits = [
  {
    icon: ArrowPathIcon,
    title: "Automatic Sync",
    description: "Keep your work synchronized across devices",
  },
  {
    icon: CloudArrowUpIcon,
    title: "Version Control",
    description: "Track changes and collaborate with your team",
  },
  {
    icon: ShieldCheckIcon,
    title: "Backup & Recovery",
    description: "Never lose your work with automatic backups",
  },
];

/**
 * Get the remote URL of the repository
 */
async function getRemoteUrl(path: string): Promise<string | undefined> {
  try {
    const command = Command.create("git", [
      "-C",
      path,
      "remote",
      "get-url",
      "origin",
    ]);
    const output = await command.execute();
    if (output.code === 0) {
      return output.stdout.trim();
    }
  } catch {
    // No remote configured
  }
  return undefined;
}

/**
 * Parse GitHub owner/repo from remote URL
 */
function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | undefined {
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return undefined;
}

export function GitHubConnectCard({
  onConnect,
  projectPath,
  className = "",
}: GitHubConnectCardProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedRepo, setDetectedRepo] = useState<{
    url: string;
    owner: string;
    repo: string;
  } | null>(null);
  const [checkingRepo, setCheckingRepo] = useState(false);

  // Check for existing GitHub remote when projectPath changes
  useEffect(() => {
    async function detectRepo() {
      if (!projectPath) {
        setDetectedRepo(null);
        return;
      }

      setCheckingRepo(true);
      try {
        const remoteUrl = await getRemoteUrl(projectPath);
        if (remoteUrl) {
          const parsed = parseGitHubUrl(remoteUrl);
          if (parsed) {
            setDetectedRepo({
              url: remoteUrl,
              owner: parsed.owner,
              repo: parsed.repo,
            });
          } else {
            setDetectedRepo(null);
          }
        } else {
          setDetectedRepo(null);
        }
      } catch {
        setDetectedRepo(null);
      } finally {
        setCheckingRepo(false);
      }
    }

    detectRepo();
  }, [projectPath]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      await onConnect();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to GitHub"
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className={`p-6 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
          <GitHubIcon className="w-6 h-6 text-surface-700 dark:text-surface-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Connect to GitHub
          </h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
            Link this project to a GitHub repository to enable sync and version
            control
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-lg"
            >
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    {benefit.title}
                  </span>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  {benefit.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detected repo indicator */}
      {!checkingRepo && detectedRepo && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Detected GitHub Repository
            </span>
          </div>
          <a
            href={`https://github.com/${detectedRepo.owner}/${detectedRepo.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            {detectedRepo.owner}/{detectedRepo.repo}
            <svg
              className="w-3 h-3"
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
          </a>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connecting ? (
          <>
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
            Connecting...
          </>
        ) : (
          <>
            <GitHubIcon className="w-4 h-4" />
            {detectedRepo
              ? `Connect ${detectedRepo.owner}/${detectedRepo.repo}`
              : "Connect to GitHub"}
          </>
        )}
      </button>

      {/* Help text */}
      <div className="mt-4 p-3 bg-accent-50 dark:bg-accent-900/20 rounded-lg border border-accent-200 dark:border-accent-800/50">
        <p className="text-xs text-accent-700 dark:text-accent-300">
          {detectedRepo ? (
            <>
              <strong>Note:</strong> We detected a GitHub remote in your
              project. Click the button above to authenticate with GitHub and
              enable sync.
            </>
          ) : (
            <>
              <strong>Note:</strong> Clicking the button will open GitHub to
              authorize SpecFlux. After authorization, your project will be
              linked to your GitHub account.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
