import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { api, PrdDocumentType } from "../../api";

interface CreatePrdModalProps {
  projectPath: string;
  projectRef: string;
  onClose: () => void;
  onCreated: (prdId: string, hasDocument: boolean) => void;
}

export function CreatePrdModal({
  projectPath,
  projectRef,
  onClose,
  onCreated,
}: CreatePrdModalProps) {
  const [prdTitle, setPrdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: "Select PRD Document",
        filters: [
          { name: "Markdown", extensions: ["md", "markdown"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
        setError(null);

        // Extract title from filename if empty
        if (!prdTitle.trim()) {
          const filename = selected.split("/").pop() || "";
          const titleFromFile = filename
            .replace(/\.md$/i, "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          setPrdTitle(titleFromFile);
        }
      }
    } catch (err) {
      console.error("[CreatePrdModal] Failed to open file picker:", err);
      setError(
        `Failed to open file picker: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  const handleCreate = async () => {
    if (!prdTitle.trim()) return;

    setCreating(true);
    setError(null);

    try {
      // 1. Create PRD via API
      const prd = await api.prds.createPrd({
        projectRef,
        createPrdRequest: {
          title: prdTitle.trim(),
          description: description.trim() || undefined,
        },
      });

      // 2. Create the folder
      const prdDir = await join(projectPath, prd.folderPath);
      const prdDirExists = await exists(prdDir);

      if (!prdDirExists) {
        await mkdir(prdDir, { recursive: true });
      }

      // 3. If file is selected, copy it
      if (selectedFile) {
        const content = await readTextFile(selectedFile);
        const destPath = await join(prdDir, "prd.md");
        await writeTextFile(destPath, content);

        // 4. Register the document with the PRD
        await api.prds.addPrdDocument({
          projectRef,
          prdRef: prd.id,
          addPrdDocumentRequest: {
            fileName: "prd.md",
            filePath: `${prd.folderPath}/prd.md`,
            documentType: PrdDocumentType.Prd,
            isPrimary: true,
          },
        });
      }

      // 5. Navigate to PRD detail page
      onCreated(prd.id, !!selectedFile);
      onClose();
    } catch (err) {
      console.error("Failed to create PRD:", err);
      setError(err instanceof Error ? err.message : "Failed to create PRD");
    } finally {
      setCreating(false);
    }
  };

  const displayFilename = selectedFile?.split("/").pop();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-surface-200 dark:border-surface-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            Create PRD
          </h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-white transition-colors"
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

          {/* PRD Title */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              PRD Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={prdTitle}
              onChange={(e) => setPrdTitle(e.target.value)}
              placeholder="e.g., User Authentication System"
              className="input w-full"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description{" "}
              <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this PRD"
              className="input w-full resize-none"
              rows={2}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Import existing document{" "}
              <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-surface-600 dark:text-surface-400 truncate flex items-center">
                {displayFilename ? (
                  <>
                    <span className="font-mono truncate flex-1">
                      {displayFilename}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="ml-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                      title="Clear selection"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-surface-400 dark:text-surface-500">
                    No file selected
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="px-4 py-2 bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 rounded-lg text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-600 transition-colors flex items-center gap-2"
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
            <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
              You can also draft your PRD with Claude after creation
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !prdTitle.trim()}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating && (
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
            Create PRD
          </button>
        </div>
      </div>
    </div>
  );
}
