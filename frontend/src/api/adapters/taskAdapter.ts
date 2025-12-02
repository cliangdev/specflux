/**
 * Task Model Adapter
 *
 * Converts between v1 and v2 Task models for UI compatibility.
 * The UI uses a unified TaskDisplay type that works with both backends.
 */

import type { Task as V1Task } from "../generated";
import type { Task as V2Task } from "../v2/generated";

/**
 * Unified task display model for UI components.
 * Contains fields common to both v1 and v2, with consistent types.
 */
export interface TaskDisplay {
  /** Unique identifier - v1 id (number) or v2 publicId (string) */
  id: string | number;
  /** Display key like "SPEC-42" (v2) or just "#id" (v1) */
  displayKey: string;
  /** Task title */
  title: string;
  /** Task description */
  description?: string;
  /** Status string (normalized to lowercase with underscores) */
  status: string;
  /** Priority level */
  priority?: string;
  /** Epic ID - v1 epicId (number) or v2 epicId (string) */
  epicId?: string | number;
  /** Epic display key (v2 only) */
  epicDisplayKey?: string;
  /** Repository name (v1 only) */
  repoName?: string;
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
  /** Source backend: v1 or v2 */
  _source: "v1" | "v2";
}

/**
 * Convert v1 Task to unified TaskDisplay.
 */
export function v1TaskToDisplay(task: V1Task): TaskDisplay {
  return {
    id: task.id,
    displayKey: `#${task.id}`,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    epicId: task.epicId ?? undefined,
    repoName: task.repoName ?? undefined,
    requiresApproval: task.requiresApproval,
    estimatedDuration: task.estimatedDuration ?? undefined,
    createdAt: task.createdAt, // Already a Date from generated types
    updatedAt: task.updatedAt, // Already a Date from generated types
    githubPrUrl: task.githubPrUrl ?? undefined,
    _source: "v1",
  };
}

/**
 * Convert v2 Task to unified TaskDisplay.
 */
export function v2TaskToDisplay(task: V2Task): TaskDisplay {
  // Map v2 status enum to lowercase string
  const statusMap: Record<string, string> = {
    BACKLOG: "backlog",
    READY: "ready",
    IN_PROGRESS: "in_progress",
    PENDING_REVIEW: "pending_review",
    APPROVED: "approved",
    DONE: "done",
  };
  const statusString = statusMap[task.status] || "backlog";

  return {
    id: task.publicId,
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
    _source: "v2",
  };
}

/**
 * Convert array of v1 Tasks to TaskDisplay array.
 */
export function v1TasksToDisplay(tasks: V1Task[]): TaskDisplay[] {
  if (!Array.isArray(tasks)) {
    console.error(
      "[v1TasksToDisplay] Expected array, got:",
      typeof tasks,
      tasks,
    );
    return [];
  }
  return tasks.map((task, index) => {
    try {
      return v1TaskToDisplay(task);
    } catch (err) {
      console.error(
        `[v1TasksToDisplay] Error converting task at index ${index}:`,
        task,
        err,
      );
      throw err;
    }
  });
}

/**
 * Convert array of v2 Tasks to TaskDisplay array.
 */
export function v2TasksToDisplay(tasks: V2Task[]): TaskDisplay[] {
  if (!Array.isArray(tasks)) {
    console.error(
      "[v2TasksToDisplay] Expected array, got:",
      typeof tasks,
      tasks,
    );
    return [];
  }
  return tasks.map((task, index) => {
    try {
      return v2TaskToDisplay(task);
    } catch (err) {
      console.error(
        `[v2TasksToDisplay] Error converting task at index ${index}:`,
        task,
        err,
      );
      throw err;
    }
  });
}
