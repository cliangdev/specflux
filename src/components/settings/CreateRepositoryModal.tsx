import { useState } from "react";
import {
  createRepository,
  addToGitignore,
} from "../../services/git";

interface CreateRepositoryModalProps {
  localPath: string;
  onClose: () => void;
  onCreated: (repoName: string, repoPath: string) => void;
}

export function CreateRepositoryModal({
  localPath,
  onClose,
  onCreated,
}: CreateRepositoryModalProps) {
  const [repoName, setRepoName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repoPath = repoName ? `${localPath}/${repoName}` : "";
  const isValidName = repoName.length === 0 || /^[a-zA-Z0-9_-]+$/.test(repoName);

  const handleCreate = async () => {
    if (!repoName || !isValidName) return;

    setCreating(true);
    setError(null);

    try {
      const result = await createRepository(localPath, repoName);
      if (result.success) {
        await addToGitignore(localPath, repoName);
        onCreated(repoName, result.path);
        onClose();
      } else {
        setError(result.error || "Failed to create repository");
        setCreating(false);
      }
    } catch (err) {
      setError("Failed to create repository: " + String(err));
      setCreating(false);
    }
  };

  const handleNameChange = (value: string) => {
    // Auto-format: lowercase, replace spaces with hyphens
    const formatted = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
    setRepoName(formatted);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create New Repository
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Repository Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm focus:ring-1 outline-none bg-white dark:bg-slate-900 ${
                repoName && !isValidName
                  ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 dark:border-slate-700 focus:border-brand-500 focus:ring-brand-500"
              }`}
              placeholder="wealth-management-devops"
              autoFocus
            />
            {repoName && !isValidName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Only letters, numbers, hyphens, and underscores allowed
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use lowercase letters, numbers, hyphens, and underscores
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Location
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm text-gray-600 dark:text-gray-300 font-mono min-h-[38px] overflow-x-auto whitespace-nowrap">
              {repoPath || (
                <span className="text-gray-400 dark:text-gray-500 font-sans">
                  Enter a repository name above
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            This will create a new directory and initialize an empty git repository.
          </p>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!repoName || !isValidName || creating}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium shadow-sm"
          >
            {creating ? "Creating..." : "Create Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
