import { useState, useEffect, useCallback } from "react";
import { api, type TaskFileChanges } from "../api";

interface FileChangesProps {
  taskId: number;
  isAgentRunning: boolean;
  onHasChanges?: (hasChanges: boolean, count: number) => void;
}

export function FileChanges({
  taskId,
  isAgentRunning,
  onHasChanges,
}: FileChangesProps) {
  const [fileChanges, setFileChanges] = useState<TaskFileChanges | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFileChanges = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await api.tasks.getTaskFileChanges({
          id: taskId,
        });
        setFileChanges(response.data ?? null);
      } catch (err) {
        console.error("Failed to fetch file changes:", err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [taskId],
  );

  // Initial fetch
  useEffect(() => {
    fetchFileChanges(true);
  }, [fetchFileChanges]);

  // Light polling - only fetch every 30 seconds as a fallback
  // Real-time updates should come from Terminal WebSocket events
  useEffect(() => {
    if (!isAgentRunning) return;

    const interval = setInterval(() => {
      fetchFileChanges(false);
    }, 30000); // 30 second polling as fallback

    return () => clearInterval(interval);
  }, [isAgentRunning, fetchFileChanges]);

  // Notify parent when changes are detected
  useEffect(() => {
    const hasChanges = fileChanges && fileChanges.changes.length > 0;
    onHasChanges?.(hasChanges ?? false, fileChanges?.changes.length ?? 0);
  }, [fileChanges, onHasChanges]);

  if (loading) {
    return <p className="text-system-500 text-sm">Loading...</p>;
  }

  if (!fileChanges || fileChanges.changes.length === 0) {
    return (
      <p className="text-sm text-system-500 dark:text-system-400">
        No file changes tracked yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-2">
        {fileChanges.summary.created > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {fileChanges.summary.created} created
          </span>
        )}
        {fileChanges.summary.modified > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            {fileChanges.summary.modified} modified
          </span>
        )}
        {fileChanges.summary.deleted > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            {fileChanges.summary.deleted} deleted
          </span>
        )}
      </div>
      {/* File list */}
      <ul className="text-xs text-system-600 dark:text-system-400 space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
        {fileChanges.changes.map((change, index) => (
          <li
            key={`${change.filePath}-${index}`}
            className="flex items-center gap-1.5 py-0.5"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                change.changeType === "created"
                  ? "bg-emerald-500"
                  : change.changeType === "deleted"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`}
            />
            <span className="truncate" title={change.filePath}>
              {change.filePath}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileChanges;
