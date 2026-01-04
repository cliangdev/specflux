import { useState } from "react";
import { setRemoteUrl, parseGitHubUrl } from "../../services/gitOperations";

interface LinkRepositoryModalProps {
  repoDir: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const XMarkIcon = ({ className }: { className?: string }) => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

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

export function LinkRepositoryModal({
  repoDir,
  onSuccess,
  onCancel,
}: LinkRepositoryModalProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate GitHub URL format
  const parsedRepo = repoUrl.trim() ? parseGitHubUrl(repoUrl.trim()) : undefined;
  const isValidUrl = parsedRepo !== undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repoUrl.trim() || !isValidUrl) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await setRemoteUrl(repoDir, repoUrl.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link repository");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className="flex-shrink-0 p-2 bg-accent-100 dark:bg-accent-900/30 rounded-full">
            <LinkIcon className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Link Repository
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              Connect this project to a GitHub repository.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-surface-400 hover:text-surface-600 dark:hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
                {error}
              </div>
            )}

            {/* Link Existing Tab */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  GitHub Repository URL
                </span>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://github.com/owner/repo"
                  className="input mt-1.5 w-full"
                  autoFocus
                />
              </label>

              {/* URL Preview */}
              {repoUrl.trim() && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg ${
                    isValidUrl
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isValidUrl && parsedRepo ? (
                    <>
                      Repository:{" "}
                      <span className="font-medium">
                        {parsedRepo.owner}/{parsedRepo.repo}
                      </span>
                    </>
                  ) : (
                    "Please enter a valid GitHub URL (HTTPS or SSH)"
                  )}
                </div>
              )}

              <p className="text-xs text-surface-500 dark:text-surface-400">
                Supported formats:
                <br />
                <code className="text-xs">
                  https://github.com/owner/repo.git
                </code>
                <br />
                <code className="text-xs">git@github.com:owner/repo.git</code>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isValidUrl}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
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
              Link Repository
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
