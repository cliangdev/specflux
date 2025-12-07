import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { readDir, readTextFile, stat } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import MarkdownRenderer from "../components/ui/MarkdownRenderer";
import { useProject } from "../contexts/ProjectContext";

interface PrdFile {
  name: string;
  path: string;
  lastModified: Date | null;
}

export default function PRDDetailPage() {
  const { prdName } = useParams<{ prdName: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  const [files, setFiles] = useState<PrdFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodedPrdName = prdName ? decodeURIComponent(prdName) : "";

  const loadFiles = useCallback(async () => {
    if (!currentProject?.localPath || !decodedPrdName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prdPath = await join(
        currentProject.localPath,
        ".specflux",
        "prds",
        decodedPrdName,
      );

      const entries = await readDir(prdPath);

      // Get file info for each file
      const fileList: PrdFile[] = [];
      for (const entry of entries) {
        if (entry.isFile && entry.name) {
          const filePath = await join(prdPath, entry.name);
          let lastModified: Date | null = null;

          try {
            const fileStat = await stat(filePath);
            if (fileStat.mtime) {
              lastModified = new Date(fileStat.mtime);
            }
          } catch {
            // Skip stat errors
          }

          fileList.push({
            name: entry.name,
            path: filePath,
            lastModified,
          });
        }
      }

      // Sort: prd.md first, then alphabetically
      fileList.sort((a, b) => {
        if (a.name === "prd.md") return -1;
        if (b.name === "prd.md") return 1;
        return a.name.localeCompare(b.name);
      });

      setFiles(fileList);

      // Select default file (prd.md if exists, otherwise first file)
      if (fileList.length > 0) {
        const defaultFile =
          fileList.find((f) => f.name === "prd.md") || fileList[0];
        setSelectedFile(defaultFile.name);
      }
    } catch (err) {
      console.error("Failed to load PRD files:", err);
      setError(err instanceof Error ? err.message : "Failed to load PRD");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.localPath, decodedPrdName]);

  // Load file content when selection changes
  const loadContent = useCallback(async () => {
    if (!currentProject?.localPath || !decodedPrdName || !selectedFile) {
      setContent("");
      return;
    }

    setContentLoading(true);

    try {
      const filePath = await join(
        currentProject.localPath,
        ".specflux",
        "prds",
        decodedPrdName,
        selectedFile,
      );

      const text = await readTextFile(filePath);
      setContent(text);
    } catch (err) {
      console.error("Failed to load file content:", err);
      setContent(
        `*Error loading file: ${err instanceof Error ? err.message : "Unknown error"}*`,
      );
    } finally {
      setContentLoading(false);
    }
  }, [currentProject?.localPath, decodedPrdName, selectedFile]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleBack = () => {
    navigate("/prds");
  };

  const handleFileSelect = (fileName: string) => {
    setSelectedFile(fileName);
  };

  // No project
  if (!currentProject?.localPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-system-500 dark:text-system-400">
            Project path not configured.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Back to PRDs
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-system-500 dark:text-system-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={handleBack}
            className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Back to PRDs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-system-200 dark:border-system-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-system-500 hover:text-system-700 dark:text-system-400 dark:hover:text-system-200 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to PRDs
            </button>
            <h1 className="text-xl font-semibold text-system-900 dark:text-white">
              {decodedPrdName}
            </h1>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              // TODO: Phase 2B - Add document
              console.log("Add Document - will be implemented later");
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Document
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-system-200 dark:border-system-700 bg-system-50 dark:bg-system-900 overflow-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-system-400 dark:text-system-500 mb-3">
              Documents
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-system-500 dark:text-system-400">
                No files found
              </p>
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={file.name}>
                    <button
                      onClick={() => handleFileSelect(file.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFile === file.name
                          ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                          : "text-system-600 dark:text-system-400 hover:bg-system-100 dark:hover:bg-system-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="truncate">
                          {file.name.replace(/\.md$/, "")}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Markdown Content */}
        <div className="flex-1 overflow-auto">
          {contentLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-system-500 dark:text-system-400">
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
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
                Loading...
              </div>
            </div>
          ) : !selectedFile ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-system-500 dark:text-system-400">
                Select a file to view
              </p>
            </div>
          ) : (
            <div className="p-8">
              <MarkdownRenderer source={content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
