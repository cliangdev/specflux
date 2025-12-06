import { useEffect } from "react";

/**
 * File change entry. Local type since v2 API doesn't have file tracking yet.
 */
interface FileChange {
  filePath: string;
  changeType: "created" | "modified" | "deleted";
}

/**
 * Task file changes response. Local type for v2 API compatibility.
 */
interface TaskFileChanges {
  changes: FileChange[];
  summary: {
    created: number;
    modified: number;
    deleted: number;
  };
}

interface FileChangesProps {
  taskId: number | string;
  isAgentRunning: boolean;
  onHasChanges?: (hasChanges: boolean, count: number) => void;
}

/**
 * FileChanges component - displays file changes made by an agent.
 *
 * Note: File tracking is not yet implemented in the v2 API.
 * This component renders a placeholder until the API is available.
 */
export function FileChanges({
  taskId,
  isAgentRunning,
  onHasChanges,
}: FileChangesProps) {
  // Notify parent that there are no changes (API not available)
  useEffect(() => {
    onHasChanges?.(false, 0);
  }, [onHasChanges]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        File change tracking is not yet available in the v2 API.
      </p>
      {isAgentRunning && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Agent is running for task {taskId}
        </p>
      )}
    </div>
  );
}

export default FileChanges;

// Re-export types for consumers
export type { FileChange, TaskFileChanges };
