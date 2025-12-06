import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useProject } from "../contexts/ProjectContext";
import { useTerminal } from "../contexts/TerminalContext";
import PrdImportModal from "../components/ui/PrdImportModal";

interface PrdFolder {
  name: string;
  path: string;
  fileCount: number;
  lastModified: Date | null;
}

export default function PRDsPage() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { openTerminalForContext } = useTerminal();
  const [prdFolders, setPrdFolders] = useState<PrdFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

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
      <div className="text-center py-12">
        <div className="text-system-500 dark:text-system-400 text-lg">
          No project selected
        </div>
        <p className="text-system-400 dark:text-system-500 mt-2">
          Select a project from the dropdown above
        </p>
      </div>
    );
  }

  // No local path configured
  if (!currentProject.localPath) {
    return (
      <div className="text-center py-12 card">
        <svg
          className="mx-auto h-12 w-12 text-amber-500 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
          Project Path Not Set
        </h3>
        <p className="mt-2 text-system-500">
          Set the local path for this project to manage PRDs.
        </p>
        <button
          onClick={() => navigate("/settings")}
          className="mt-4 btn btn-primary"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-system-900 dark:text-white">
          PRDs
        </h1>
        <div className="flex items-center gap-3">
          {/* Import button */}
          <button
            className="btn btn-ghost"
            onClick={() => setShowImportModal(true)}
            title="Import PRD"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>

          {/* Refresh button */}
          <button
            onClick={loadPrdFolders}
            className="btn btn-ghost"
            title="Refresh"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Create button */}
          <button
            className="btn btn-primary"
            onClick={() => {
              openTerminalForContext({
                type: "prd-workshop",
                id: `new-${Date.now()}`,
                title: "PRD Workshop",
                workingDirectory: currentProject?.localPath,
                initialCommand: "claude",
              });
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
            Create PRD
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-8 h-8 text-brand-500"
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
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 text-lg">
            Error loading PRDs
          </div>
          <p className="text-system-500 mt-2">{error}</p>
          <button onClick={loadPrdFolders} className="mt-4 btn btn-primary">
            Try Again
          </button>
        </div>
      ) : prdFolders.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-system-400 dark:text-system-500"
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
          <h3 className="mt-4 text-lg font-medium text-system-700 dark:text-system-300">
            No PRDs
          </h3>
          <p className="mt-2 text-system-500">
            Get started by creating your first PRD.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prdFolders.map((folder) => (
            <button
              key={folder.name}
              onClick={() => handlePrdClick(folder.name)}
              className="card text-left p-4 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all group"
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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

      {/* Import PRD Modal */}
      {showImportModal && currentProject?.localPath && (
        <PrdImportModal
          projectPath={currentProject.localPath}
          onClose={() => setShowImportModal(false)}
          onImported={loadPrdFolders}
        />
      )}
    </div>
  );
}
