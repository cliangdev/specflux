/**
 * Epic Model Adapter
 *
 * Converts between v1 and v2 Epic models for UI compatibility.
 */

import type { Epic as V1Epic } from "../generated";
import type { Epic as V2Epic } from "../v2/generated";

/**
 * Unified epic display model for UI components.
 */
export interface EpicDisplay {
  /** Unique identifier - v1 id (number) or v2 publicId (string) */
  id: string | number;
  /** Display key like "SPEC-E1" (v2) or just the id (v1) */
  displayKey: string;
  /** Epic title */
  title: string;
  /** Epic description */
  description?: string;
  /** Status string */
  status: string;
  /** Target date */
  targetDate?: Date;
  /** PRD file path */
  prdFilePath?: string;
  /** Epic file path */
  epicFilePath?: string;
  /** Dependency IDs (publicIds for v2, numeric ids for v1) */
  dependsOn?: (string | number)[];
  /** Computed phase based on dependency depth */
  phase?: number;
  /** Task statistics */
  taskStats?: { total?: number; done?: number; inProgress?: number };
  /** Progress percentage */
  progressPercentage?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Source backend */
  _source: "v1" | "v2";
}

/**
 * Convert v1 Epic to unified EpicDisplay.
 */
export function v1EpicToDisplay(epic: V1Epic): EpicDisplay {
  return {
    id: epic.id,
    displayKey: `E-${epic.id}`,
    title: epic.title,
    description: epic.description ?? undefined,
    status: epic.status,
    targetDate: epic.targetDate ?? undefined,
    prdFilePath: epic.prdFilePath ?? undefined,
    epicFilePath: epic.epicFilePath ?? undefined,
    dependsOn: epic.dependsOn ?? undefined,
    phase: epic.phase ?? undefined,
    taskStats: epic.taskStats ?? undefined,
    progressPercentage: epic.progressPercentage ?? undefined,
    createdAt: epic.createdAt,
    updatedAt: epic.updatedAt,
    _source: "v1",
  };
}

/**
 * Convert v2 Epic to unified EpicDisplay.
 */
export function v2EpicToDisplay(epic: V2Epic): EpicDisplay {
  // Map v2 status enum to lowercase string
  const statusMap: Record<string, string> = {
    PLANNING: "planning",
    IN_PROGRESS: "active",
    COMPLETED: "completed",
  };
  const statusString = statusMap[epic.status] || "planning";

  return {
    id: epic.publicId,
    displayKey: epic.displayKey,
    title: epic.title,
    description: epic.description ?? undefined,
    status: statusString,
    targetDate: epic.targetDate ?? undefined,
    prdFilePath: epic.prdFilePath ?? undefined,
    epicFilePath: epic.epicFilePath ?? undefined,
    dependsOn: epic.dependsOn ?? undefined,
    phase: epic.phase ?? undefined,
    taskStats: epic.taskStats ?? undefined,
    progressPercentage: epic.progressPercentage ?? undefined,
    createdAt: epic.createdAt,
    updatedAt: epic.updatedAt,
    _source: "v2",
  };
}

/**
 * Convert array of v1 Epics to EpicDisplay array.
 */
export function v1EpicsToDisplay(epics: V1Epic[]): EpicDisplay[] {
  if (!Array.isArray(epics)) {
    console.error(
      "[v1EpicsToDisplay] Expected array, got:",
      typeof epics,
      epics,
    );
    return [];
  }
  return epics.map((epic, index) => {
    try {
      return v1EpicToDisplay(epic);
    } catch (err) {
      console.error(
        `[v1EpicsToDisplay] Error converting epic at index ${index}:`,
        epic,
        err,
      );
      throw err;
    }
  });
}

/**
 * Convert array of v2 Epics to EpicDisplay array.
 */
export function v2EpicsToDisplay(epics: V2Epic[]): EpicDisplay[] {
  if (!Array.isArray(epics)) {
    console.error(
      "[v2EpicsToDisplay] Expected array, got:",
      typeof epics,
      epics,
    );
    return [];
  }
  return epics.map((epic, index) => {
    try {
      return v2EpicToDisplay(epic);
    } catch (err) {
      console.error(
        `[v2EpicsToDisplay] Error converting epic at index ${index}:`,
        epic,
        err,
      );
      throw err;
    }
  });
}
