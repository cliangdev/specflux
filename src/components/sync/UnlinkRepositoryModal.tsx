import { useState } from "react";
import { removeRemote } from "../../services/gitOperations";
import { api } from "../../api/client";
import { getApiErrorMessage } from "../../api";

interface UnlinkRepositoryModalProps {
  repoDir: string;
  repoFullName: string; // "owner/repo"
  onSuccess: () => void;
  onCancel: () => void;
}

type UnlinkMode = "unlink-only" | "unlink-and-delete";

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

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
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
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

export function UnlinkRepositoryModal({
  repoDir,
  repoFullName,
  onSuccess,
  onCancel,
}: UnlinkRepositoryModalProps) {
  const [mode, setMode] = useState<UnlinkMode>("unlink-only");
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repoName = repoFullName.split("/").pop() || "";
  const [owner, repo] = repoFullName.split("/");
  const canDelete = mode === "unlink-and-delete" && confirmText === repoName;

  const handleUnlink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // If deleting from GitHub, do that first
      if (mode === "unlink-and-delete") {
        if (confirmText !== repoName) {
          setError("Please type the repository name to confirm deletion");
          setIsLoading(false);
          return;
        }
        await api.github.deleteGithubRepo({ owner, repo });
      }

      // Remove the git remote
      await removeRemote(repoDir);
      onSuccess();
    } catch (err) {
      const message = await getApiErrorMessage(err, "Failed to unlink repository");
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
            Unlink Repository
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
          <form onSubmit={handleUnlink} className="space-y-4">
            {/* Current repo info */}
            <div className="p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
              <p className="text-sm text-surface-600 dark:text-surface-300">
                Currently linked to:
              </p>
              <p className="text-sm font-medium text-surface-900 dark:text-white mt-1">
                {repoFullName}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                <input
                  type="radio"
                  name="unlink-mode"
                  checked={mode === "unlink-only"}
                  onChange={() => {
                    setMode("unlink-only");
                    setConfirmText("");
                    setError(null);
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-surface-900 dark:text-white">
                    Unlink only
                  </span>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    Remove the connection. The repository will remain on GitHub.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                <input
                  type="radio"
                  name="unlink-mode"
                  checked={mode === "unlink-and-delete"}
                  onChange={() => {
                    setMode("unlink-and-delete");
                    setError(null);
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-semantic-error">
                    Unlink and delete from GitHub
                  </span>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    Remove the connection AND permanently delete the repository from GitHub.
                  </p>
                </div>
              </label>
            </div>

            {/* Confirmation for delete */}
            {mode === "unlink-and-delete" && (
              <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-semantic-error flex-shrink-0" />
                  <p className="text-sm text-semantic-error">
                    This action cannot be undone. The repository will be permanently deleted from GitHub.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Type <span className="font-mono font-bold">{repoName}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => {
                      setConfirmText(e.target.value);
                      setError(null);
                    }}
                    placeholder={repoName}
                    className="input w-full"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-sm text-semantic-error">
                {error}
              </div>
            )}

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
                disabled={isLoading || (mode === "unlink-and-delete" && !canDelete)}
                className={`btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  mode === "unlink-and-delete"
                    ? "bg-semantic-error hover:bg-semantic-error/90 text-white"
                    : "btn-primary"
                }`}
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
                {mode === "unlink-and-delete" ? "Delete & Unlink" : "Unlink"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
