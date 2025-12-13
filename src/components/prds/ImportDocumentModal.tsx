import { useState, type FormEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile, readFile, writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { PrdDocumentType } from "../../api";

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    fileName: string;
    filePath: string;
    documentType: PrdDocumentType;
  }) => Promise<void>;
  prdFolderPath: string;
  projectPath: string;
}

const DOCUMENT_TYPES = [
  {
    value: PrdDocumentType.Wireframe,
    label: "Wireframe",
    description: "UI wireframe or layout",
  },
  {
    value: PrdDocumentType.Mockup,
    label: "Mockup",
    description: "Visual mockup or screenshot",
  },
  {
    value: PrdDocumentType.Design,
    label: "Design",
    description: "Design specification",
  },
  {
    value: PrdDocumentType.Other,
    label: "Other",
    description: "Other supporting document",
  },
];

// File extensions that should be read/written as binary
const BINARY_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf"];

function isBinaryFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  return BINARY_EXTENSIONS.includes(ext);
}

export function ImportDocumentModal({
  isOpen,
  onClose,
  onImport,
  prdFolderPath,
  projectPath,
}: ImportDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<PrdDocumentType>(
    PrdDocumentType.Wireframe
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: "Select Document",
        filters: [
          { name: "Documents", extensions: ["md", "html", "txt"] },
          { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
        setError(null);

        // Auto-detect document type from extension
        const ext = selected.toLowerCase();
        if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif")) {
          setDocumentType(PrdDocumentType.Mockup);
        } else if (ext.endsWith(".html")) {
          setDocumentType(PrdDocumentType.Wireframe);
        } else if (ext.endsWith(".md")) {
          setDocumentType(PrdDocumentType.Wireframe);
        }
      }
    } catch (err) {
      console.error("Failed to open file picker:", err);
      setError(
        `Failed to open file picker: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a file to import");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Get just the filename
      const fileName = selectedFile.split("/").pop() || "document";

      // Build destination path
      const destDir = await join(projectPath, prdFolderPath);
      const destPath = await join(destDir, fileName);
      const relativePath = `${prdFolderPath}/${fileName}`;

      // Copy the file to the PRD folder
      if (isBinaryFile(fileName)) {
        // Read and write as binary for images
        const content = await readFile(selectedFile);
        await writeFile(destPath, content);
      } else {
        // Read and write as text for md, html, etc.
        const content = await readTextFile(selectedFile);
        await writeTextFile(destPath, content);
      }

      // Register with API
      await onImport({
        fileName,
        filePath: relativePath,
        documentType,
      });

      // Reset and close
      setSelectedFile(null);
      setDocumentType(PrdDocumentType.Wireframe);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import document");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDocumentType(PrdDocumentType.Wireframe);
    setError(null);
    onClose();
  };

  const displayFilename = selectedFile?.split("/").pop();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-surface-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Import Document
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Import a wireframe, mockup, or supporting document
            </p>
          </div>
          <button
            onClick={handleClose}
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

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Select file
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg text-sm font-mono text-surface-600 dark:text-surface-400 truncate">
                  {displayFilename || (
                    <span className="text-surface-400 dark:text-surface-500 font-sans">
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
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Document Type
              </label>
              <div className="space-y-2">
                {DOCUMENT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      documentType === type.value
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      value={type.value}
                      checked={documentType === type.value}
                      onChange={() => setDocumentType(type.value)}
                      className="text-accent-500 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-surface-900 dark:text-white">
                        {type.label}
                      </div>
                      <div className="text-xs text-surface-500 dark:text-surface-400">
                        {type.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Destination info */}
            {selectedFile && (
              <p className="text-xs text-surface-500 dark:text-surface-400 font-mono">
                Will be copied to: {prdFolderPath}/{displayFilename}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
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
        </form>
      </div>
    </div>
  );
}
