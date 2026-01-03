import { useState } from "react";

interface ConflictFile {
  path: string;
  hasLocalChanges: boolean;
  hasRemoteChanges: boolean;
}

interface ConflictResolutionModalProps {
  conflictedFiles: ConflictFile[];
  onClose: () => void;
  onResolve: (
    strategy: "keep_local" | "keep_remote" | "manual",
    files?: string[]
  ) => Promise<void>;
}

type ResolutionStrategy = "keep_local" | "keep_remote" | "manual";

// Close icon
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

// Code bracket icon
const CodeBracketIcon = ({ className }: { className?: string }) => (
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
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
    />
  </svg>
);

// Computer desktop icon
const ComputerDesktopIcon = ({ className }: { className?: string }) => (
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
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
    />
  </svg>
);

// Cloud icon
const CloudIcon = ({ className }: { className?: string }) => (
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
      d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
    />
  </svg>
);

// Document text icon
const DocumentTextIcon = ({ className }: { className?: string }) => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

export function ConflictResolutionModal({
  conflictedFiles,
  onClose,
  onResolve,
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] =
    useState<ResolutionStrategy | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(conflictedFiles.map((f) => f.path))
  );
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!selectedStrategy) return;

    try {
      setResolving(true);
      setError(null);
      await onResolve(selectedStrategy, Array.from(selectedFiles));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve conflicts");
    } finally {
      setResolving(false);
    }
  };

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const strategyOptions = [
    {
      value: "keep_local" as ResolutionStrategy,
      label: "Keep Local Version",
      description:
        "Overwrite remote changes with your local version for selected files",
      icon: ComputerDesktopIcon,
      color: "accent",
    },
    {
      value: "keep_remote" as ResolutionStrategy,
      label: "Keep Remote Version",
      description:
        "Overwrite local changes with the remote version for selected files",
      icon: CloudIcon,
      color: "accent",
    },
    {
      value: "manual" as ResolutionStrategy,
      label: "Show Diff & Merge Manually",
      description: "Open diff viewer to manually merge conflicting changes",
      icon: CodeBracketIcon,
      color: "amber",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-surface-200 dark:border-surface-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Resolve Sync Conflicts
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              {conflictedFiles.length}{" "}
              {conflictedFiles.length === 1 ? "file has" : "files have"}{" "}
              conflicting changes
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto scrollbar-thin flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Conflicted files list */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-surface-900 dark:text-white mb-3">
              Conflicted Files
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin p-3 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800">
              {conflictedFiles.map((file) => (
                <label
                  key={file.path}
                  className="flex items-start gap-3 p-2 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => toggleFile(file.path)}
                    className="mt-1 w-4 h-4 text-accent-600 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 rounded focus:ring-accent-500 focus:ring-offset-white dark:focus:ring-offset-surface-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DocumentTextIcon className="w-4 h-4 text-surface-400 flex-shrink-0" />
                      <span className="text-sm font-mono text-surface-900 dark:text-white truncate">
                        {file.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                      {file.hasLocalChanges && (
                        <span className="flex items-center gap-1">
                          <ComputerDesktopIcon className="w-3 h-3" />
                          Local changes
                        </span>
                      )}
                      {file.hasRemoteChanges && (
                        <span className="flex items-center gap-1">
                          <CloudIcon className="w-3 h-3" />
                          Remote changes
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {selectedFiles.size === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Select at least one file to resolve
              </p>
            )}
          </div>

          {/* Resolution strategy */}
          <div>
            <h3 className="text-sm font-medium text-surface-900 dark:text-white mb-3">
              Resolution Strategy
            </h3>
            <div className="space-y-2">
              {strategyOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedStrategy === option.value;
                const isManual = option.value === "manual";

                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) =>
                        setSelectedStrategy(e.target.value as ResolutionStrategy)
                      }
                      className="mt-1 w-4 h-4 text-accent-600 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 focus:ring-accent-500 focus:ring-offset-white dark:focus:ring-offset-surface-800"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                        <span className="text-sm font-medium text-surface-900 dark:text-white">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        {option.description}
                      </p>
                      {isManual && isSelected && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          This will open your configured diff tool
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            disabled={resolving}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={
              resolving || !selectedStrategy || selectedFiles.size === 0
            }
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolving && (
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
            {resolving
              ? "Resolving..."
              : selectedStrategy === "manual"
                ? "Open Diff Tool"
                : "Resolve Conflicts"}
          </button>
        </div>
      </div>
    </div>
  );
}
