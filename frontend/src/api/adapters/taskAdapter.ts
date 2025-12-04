/**
 * Task Model Adapter
 *
 * Converts v2 Task models to a display-friendly format for UI components.
 */

import type { Task as V2Task } from "../v2/generated";

/**
 * Unified task display model for UI components.
 * Uses v2 API types with status normalized to lowercase.
 */
export interface TaskDisplay {
  /** Unique identifier (v2 public ID string) */
  id: string;
  /** Display key like "SPEC-42" */
  displayKey: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Status string (normalized to lowercase with underscores) */
  status: string;
  /** Priority level */
  priority?: string;
  /** Epic ID (v2 public ID string) */
  epicId?: string;
  /** Epic display key */
  epicDisplayKey?: string;
  /** Whether task requires approval */
  requiresApproval: boolean;
  /** Estimated duration in minutes */
  estimatedDuration?: number;
  /** Actual duration in minutes */
  actualDuration?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** GitHub PR URL */
  githubPrUrl?: string;
}

/**
 * Map v2 status enum to lowercase string for UI display.
 */
const STATUS_MAP: Record<string, string> = {
  BACKLOG: "backlog",
  READY: "ready",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "pending_review",
  COMPLETED: "done",
};

/**
 * Convert v2 Task to TaskDisplay.
 */
export function taskToDisplay(task: V2Task): TaskDisplay {
  const statusString = STATUS_MAP[task.status] || "backlog";

  return {
    id: task.id,
    displayKey: task.displayKey,
    title: task.title,
    description: task.description ?? undefined,
    status: statusString,
    priority: task.priority ?? undefined,
    epicId: task.epicId ?? undefined,
    epicDisplayKey: task.epicDisplayKey ?? undefined,
    requiresApproval: task.requiresApproval,
    estimatedDuration: task.estimatedDuration ?? undefined,
    actualDuration: task.actualDuration ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    githubPrUrl: task.githubPrUrl ?? undefined,
  };
}

/**
 * Convert array of v2 Tasks to TaskDisplay array.
 */
export function tasksToDisplay(tasks: V2Task[]): TaskDisplay[] {
  if (!Array.isArray(tasks)) {
    console.error("[tasksToDisplay] Expected array, got:", typeof tasks, tasks);
    return [];
  }
  return tasks.map((task, index) => {
    try {
      return taskToDisplay(task);
    } catch (err) {
      console.error(
        `[tasksToDisplay] Error converting task at index ${index}:`,
        task,
        err,
      );
      throw err;
    }
  });
}

// Backwards compatibility aliases (can be removed after migration)
export const v2TaskToDisplay = taskToDisplay;
export const v2TasksToDisplay = tasksToDisplay;
