import { useState, useEffect, useCallback } from "react";
import { readTextFile, writeTextFile, stat } from "@tauri-apps/plugin-fs";
import MarkdownRenderer from "../ui/MarkdownRenderer";

interface AgentDefinitionTabProps {
  configFilePath: string | null | undefined;
  projectPath: string | null | undefined;
}

interface FileMetadata {
  size: number;
  modifiedAt: Date | null;
}

export function AgentDefinitionTab({
  configFilePath,
  projectPath,
}: AgentDefinitionTabProps) {
  // Compute full absolute path by combining project path with config file path
  const fullFilePath =
    configFilePath && projectPath
      ? `${projectPath}/${configFilePath}`
      : configFilePath;
  // File content state
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  const [saveFileError, setSaveFileError] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  const loadFileContent = useCallback(async () => {
    if (!fullFilePath) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read file content using Tauri API
      const content = await readTextFile(fullFilePath);
      setFileContent(content);
      setError(null);

      // Get file metadata
      try {
        const fileInfo = await stat(fullFilePath);
        setFileMetadata({
          size: fileInfo.size,
          modifiedAt: fileInfo.mtime ? new Date(fileInfo.mtime) : null,
        });
      } catch (statErr) {
        // File stat might fail but content read succeeded
        console.warn("Failed to get file stats:", statErr);
        setFileMetadata(null);
      }
    } catch (err) {
      console.error("Failed to read file:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to read agent definition file",
      );
      setFileContent(null);
      setFileMetadata(null);
    } finally {
      setLoading(false);
    }
  }, [fullFilePath]);

  useEffect(() => {
    loadFileContent();
  }, [loadFileContent]);

  const handleEditFile = () => {
    setEditedContent(fileContent || "");
    setSaveFileError(null);
    setIsEditingFile(true);
  };

  const handleCancelFileEdit = () => {
    setIsEditingFile(false);
    setEditedContent("");
    setSaveFileError(null);
  };

  const handleSaveFile = async () => {
    if (!fullFilePath) return;

    setSavingFile(true);
    setSaveFileError(null);

    try {
      await writeTextFile(fullFilePath, editedContent);
      setFileContent(editedContent);
      setIsEditingFile(false);
      // Refresh metadata
      try {
        const fileInfo = await stat(fullFilePath);
        setFileMetadata({
          size: fileInfo.size,
          modifiedAt: fileInfo.mtime ? new Date(fileInfo.mtime) : null,
        });
      } catch {
        // Ignore stat errors
      }
    } catch (err) {
      console.error("Failed to save file:", err);
      setSaveFileError(
        err instanceof Error ? err.message : "Failed to save file",
      );
    } finally {
      setSavingFile(false);
    }
  };

  const handleCopyPath = async () => {
    if (!fullFilePath) return;
    await navigator.clipboard.writeText(fullFilePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // No config file path or project path
  if (!fullFilePath) {
    return (
      <div className="card p-5">
        <div className="text-center py-8 text-system-500 dark:text-system-400">
          <svg
            className="mx-auto h-12 w-12 text-system-400 dark:text-system-500 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>No source file associated with this agent</p>
          <p className="text-xs mt-1">
            {!configFilePath
              ? "This agent was created manually, not synced from filesystem"
              : "Project path not set - please configure project local path in Settings"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
      {/* Edit Controls - outside content area */}
      <div className="flex justify-end mb-4">
        {isEditingFile ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelFileEdit}
              disabled={savingFile}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFile}
              disabled={savingFile}
              className="btn btn-primary text-sm"
            >
              {savingFile ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleEditFile}
            disabled={loading || !!error}
            className="btn btn-secondary text-sm"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Save error */}
      {saveFileError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
          {saveFileError}
        </div>
      )}

      {/* File content container - styled like Files page */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-[#1c2128] rounded-lg border border-gray-200 dark:border-[#30363d]">
        {/* File Path Header */}
        <div className="h-12 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between px-6 shrink-0 bg-gray-50 dark:bg-[#2d333b]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h2 className="text-sm font-medium text-gray-900 dark:text-[#adbac7] truncate">
              {fullFilePath}
            </h2>
            <button
              onClick={handleCopyPath}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
              title="Copy path"
            >
              {copied ? (
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
          {/* File metadata */}
          {fileMetadata && (
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-[#768390]">
              <span>{formatFileSize(fileMetadata.size)}</span>
              {fileMetadata.modifiedAt && (
                <span>
                  Modified: {fileMetadata.modifiedAt.toLocaleDateString()}{" "}
                  {fileMetadata.modifiedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin w-6 h-6 text-brand-500"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 dark:text-red-400 mb-2">{error}</div>
              <button
                onClick={loadFileContent}
                className="btn btn-secondary text-sm"
              >
                Try Again
              </button>
            </div>
          ) : isEditingFile ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full font-mono text-sm p-8 bg-white dark:bg-[#1c2128] text-gray-800 dark:text-[#adbac7] resize-none focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <div className="p-8">
              <MarkdownRenderer source={fileContent || ""} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
