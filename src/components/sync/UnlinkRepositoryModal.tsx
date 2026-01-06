import { useState } from "react";
import { removeRemote } from "../../services/gitOperations";

interface UnlinkRepositoryModalProps {
  repoDir: string;
  repoFullName: string; // "owner/repo"
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

export function UnlinkRepositoryModal({
  repoDir,
  repoFullName,
  onSuccess,
  onCancel,
}: UnlinkRepositoryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await removeRemote(repoDir);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlink repository";
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
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
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

            {/* Explanation */}
            <p className="text-sm text-surface-600 dark:text-surface-400">
              This will remove the connection between this project and the
              GitHub repository. The repository will remain on GitHub.
            </p>

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
                disabled={isLoading}
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
                Unlink
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
