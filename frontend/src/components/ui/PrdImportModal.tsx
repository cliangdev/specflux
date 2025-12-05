import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

interface PrdImportModalProps {
  projectPath: string;
  onClose: () => void;
  onImported: () => void;
}

export default function PrdImportModal({
  projectPath,
  onClose,
  onImported,
}: PrdImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [refineAfter, setRefineAfter] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    console.log("[PrdImportModal] Opening file picker...");
    try {
      const selected = await open({
        multiple: false,
        title: "Select PRD File",
      });

      console.log("[PrdImportModal] File picker result:", selected);

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
        setError(null);
      } else if (selected === null) {
        console.log("[PrdImportModal] User cancelled file selection");
      }
    } catch (err) {
      console.error("[PrdImportModal] Failed to open file picker:", err);
      setError(
        `Failed to open file picker: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);

    try {
      // Read the source file
      const content = await readTextFile(selectedFile);

      // Ensure .specflux/prds directory exists
      const prdsDir = await join(projectPath, ".specflux", "prds");
      const prdsDirExists = await exists(prdsDir);

      if (!prdsDirExists) {
        await mkdir(prdsDir, { recursive: true });
      }

      // Get the filename from the path
      const filename = selectedFile.split("/").pop() || "imported-prd.md";
      const destPath = await join(prdsDir, filename);

      // Write the file to destination
      await writeTextFile(destPath, content);

      // TODO: If refineAfter is true, open refine flow (Phase 1C)
      if (refineAfter) {
        console.log("Refine after import selected - will be implemented later");
      }

      onImported();
      onClose();
    } catch (err) {
      console.error("Failed to import PRD:", err);
      setError(err instanceof Error ? err.message : "Failed to import PRD");
    } finally {
      setImporting(false);
    }
  };

  // Get just the filename for display
  const displayFilename = selectedFile?.split("/").pop();
  // Get the destination path preview
  const destPreview = displayFilename
    ? `.specflux/prds/${displayFilename}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white">
            Import PRD
          </h2>
          <button
            onClick={onClose}
            className="text-system-400 hover:text-system-600 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-system-700 dark:text-system-300 mb-1">
              Select file
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-system-50 dark:bg-system-900 border border-system-200 dark:border-system-700 rounded-lg text-sm font-mono text-system-600 dark:text-system-400 truncate">
                {selectedFile || (
                  <span className="text-system-400 dark:text-system-500 font-sans">
                    No file selected
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="px-4 py-2 bg-white dark:bg-system-700 border border-system-200 dark:border-system-600 text-system-700 dark:text-system-300 rounded-lg text-sm font-medium hover:bg-system-50 dark:hover:bg-system-600 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                Browse
              </button>
            </div>
          </div>

          {/* Destination Preview */}
          {destPreview && (
            <div className="text-sm text-system-500 dark:text-system-400 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Will copy to{" "}
              <span className="font-mono text-system-600 dark:text-system-300">
                {destPreview}
              </span>
            </div>
          )}

          {/* Refine Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={refineAfter}
              onChange={(e) => setRefineAfter(e.target.checked)}
              className="w-4 h-4 text-brand-600 border-system-300 dark:border-system-600 rounded focus:ring-brand-500 focus:ring-offset-white dark:focus:ring-offset-system-800"
            />
            <span className="text-sm text-system-700 dark:text-system-300">
              Refine with Claude after import
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 text-sm font-medium text-system-600 dark:text-system-300 hover:text-system-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !selectedFile}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing && (
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
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
