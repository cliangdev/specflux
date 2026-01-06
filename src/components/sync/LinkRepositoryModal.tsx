import { useState, useEffect } from "react";
import { setRemoteUrl } from "../../services/gitOperations";
import { api } from "../../api/client";
import { getApiErrorMessage } from "../../api";
import type { GithubRepo } from "../../api/generated";

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

const LockIcon = ({ className }: { className?: string }) => (
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
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const GlobeIcon = ({ className }: { className?: string }) => (
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
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);

export function LinkRepositoryModal({
  repoDir,
  onSuccess,
  onCancel,
}: LinkRepositoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive default repo name from project folder
  const projectName = repoDir.split("/").pop() || "project";
  const baseName = `specflux-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-spec`;

  // Create new repo state
  const [repoName, setRepoName] = useState(baseName);
  const [repoDescription, setRepoDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [nameConflict, setNameConflict] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false);

  // Generate unique repo name if base name conflicts
  const generateUniqueName = (base: string, existingRepos: GithubRepo[]): string => {
    const existingNames = new Set(existingRepos.map((r) => r.name.toLowerCase()));
    if (!existingNames.has(base.toLowerCase())) {
      return base;
    }
    // Try with suffix: base-1, base-2, etc.
    let suffix = 1;
    while (existingNames.has(`${base}-${suffix}`.toLowerCase())) {
      suffix++;
    }
    return `${base}-${suffix}`;
  };

  // Load repos on mount to check for name conflicts
  useEffect(() => {
    if (!reposLoaded) {
      loadRepos();
    }
  }, []);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await api.github.listGithubRepos({ perPage: 100 });
      setReposLoaded(true);

      // Check if default name conflicts and auto-suggest unique name
      const existingNames = new Set(response.repos.map((r) => r.name.toLowerCase()));
      if (existingNames.has(baseName.toLowerCase())) {
        const uniqueName = generateUniqueName(baseName, response.repos);
        setRepoName(uniqueName);
        setNameConflict(true);
      }
    } catch {
      // Failed to load repos is not critical - user can still create
      setReposLoaded(true);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) {
      setError("Repository name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create repo on GitHub
      const newRepo = await api.github.createGithubRepo({
        createGithubRepoRequest: {
          name: repoName.trim(),
          description: repoDescription.trim() || undefined,
          _private: isPrivate,
        },
      });

      // Set remote URL locally
      await setRemoteUrl(repoDir, newRepo.cloneUrl);
      onSuccess();
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to create repository");
      setError(message);
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
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-surface-200 dark:border-surface-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Create Repository
          </h2>
          <button
            onClick={onCancel}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <form onSubmit={handleCreateRepo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Repository Name
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => {
                  setRepoName(e.target.value);
                  setError(null);
                  setNameConflict(false);
                }}
                placeholder="my-project"
                className="input w-full"
                autoFocus
                disabled={loadingRepos}
              />
              {nameConflict && (
                <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                  A repository named "{baseName}" already exists, so we suggested "{repoName}"
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Description (optional)
              </label>
              <input
                type="text"
                value={repoDescription}
                onChange={(e) => setRepoDescription(e.target.value)}
                placeholder="A brief description of your project"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                  <input
                    type="radio"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <LockIcon className="w-4 h-4 text-surface-500" />
                      <span className="text-sm font-medium text-surface-900 dark:text-white">
                        Private
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      Only you can see and commit to this repository
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                  <input
                    type="radio"
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="w-4 h-4 text-surface-500" />
                      <span className="text-sm font-medium text-surface-900 dark:text-white">
                        Public
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      Anyone on the internet can see this repository
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Error message area - fixed height to prevent layout shift */}
            <div className="min-h-[52px] pt-4">
              {error && (
                <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
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
                disabled={isLoading || !repoName.trim() || loadingRepos}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(isLoading || loadingRepos) && (
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
                {loadingRepos ? "Loading..." : "Create & Link"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
