import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useProject } from "../contexts/ProjectContext";

interface PrdFolder {
  name: string;
  path: string;
  fileCount: number;
  lastModified: Date | null;
}

export default function PRDsPage() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const [prdFolders, setPrdFolders] = useState<PrdFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrdFolders = useCallback(async () => {
    if (!currentProject?.localPath) {
      setPrdFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prdsPath = await join(
        currentProject.localPath,
        ".specflux",
        "prds",
      );

      let entries;
      try {
        entries = await readDir(prdsPath);
      } catch {
        // Directory doesn't exist yet - that's fine
        setPrdFolders([]);
        setLoading(false);
        return;
      }

      // Filter to only directories and get their stats
      const folders: PrdFolder[] = [];
      for (const entry of entries) {
        if (entry.isDirectory && entry.name) {
          const folderPath = await join(prdsPath, entry.name);

          // Count files in the folder
          let fileCount = 0;
          let lastModified: Date | null = null;

          try {
            const folderEntries = await readDir(folderPath);
            fileCount = folderEntries.filter((e) => e.isFile).length;

            // Get the most recent modification time
            for (const fileEntry of folderEntries) {
              if (fileEntry.isFile && fileEntry.name) {
                try {
                  const filePath = await join(folderPath, fileEntry.name);
                  const fileStat = await stat(filePath);
                  if (fileStat.mtime) {
                    const mtime = new Date(fileStat.mtime);
                    if (!lastModified || mtime > lastModified) {
                      lastModified = mtime;
                    }
                  }
                } catch {
                  // Skip files we can't stat
                }
              }
            }
          } catch {
            // Can't read folder contents
          }

          folders.push({
            name: entry.name,
            path: folderPath,
            fileCount,
            lastModified,
          });
        }
      }

      // Sort by last modified (newest first)
      folders.sort((a, b) => {
        if (!a.lastModified && !b.lastModified) return 0;
        if (!a.lastModified) return 1;
        if (!b.lastModified) return -1;
        return b.lastModified.getTime() - a.lastModified.getTime();
      });

      setPrdFolders(folders);
    } catch (err) {
      console.error("Failed to load PRD folders:", err);
      setError(err instanceof Error ? err.message : "Failed to load PRDs");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.localPath]);

  useEffect(() => {
    loadPrdFolders();
  }, [loadPrdFolders]);

  const handlePrdClick = (prdName: string) => {
    navigate(`/prds/${encodeURIComponent(prdName)}`);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "Unknown";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // No project selected
  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-2">
            No Project Selected
          </h2>
          <p className="text-system-500 dark:text-system-400">
            Select a project to view its PRDs.
          </p>
        </div>
      </div>
    );
  }

  // No local path configured
  if (!currentProject.localPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-system-900 dark:text-white mb-2">
            Project Path Not Set
          </h2>
          <p className="text-system-500 dark:text-system-400 mb-4">
            Set the local path for this project to manage PRDs.
          </p>
          <button
            onClick={() => navigate("/settings")}
            className="btn btn-primary"
          >
            Go to Settings
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
          <h1 className="text-xl font-semibold text-system-900 dark:text-white">
            PRDs
          </h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              // TODO: Phase 2B - Open PRD workshop
              console.log("New PRD - will be implemented in Phase 2B");
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
            New PRD
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
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
              Loading PRDs...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
              <button
                onClick={loadPrdFolders}
                className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Try again
              </button>
            </div>
          </div>
        ) : prdFolders.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-system-100 dark:bg-system-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-system-400 dark:text-system-500"
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
              </div>
              <h3 className="text-lg font-medium text-system-900 dark:text-white mb-1">
                No PRDs yet
              </h3>
              <p className="text-system-500 dark:text-system-400 mb-4">
                Create your first PRD to get started with spec-driven
                development.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // TODO: Phase 2B - Open PRD workshop
                  console.log("New PRD - will be implemented in Phase 2B");
                }}
              >
                Create PRD
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prdFolders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => handlePrdClick(folder.name)}
                className="text-left p-4 rounded-lg border border-system-200 dark:border-system-700 bg-white dark:bg-system-800 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-brand-600 dark:text-brand-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-system-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {folder.name}
                    </h3>
                    <p className="text-sm text-system-500 dark:text-system-400 mt-1">
                      {folder.fileCount}{" "}
                      {folder.fileCount === 1 ? "file" : "files"} ·{" "}
                      {formatDate(folder.lastModified)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
