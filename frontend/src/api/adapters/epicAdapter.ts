/**
 * Epic Model Adapter
 *
 * Converts v2 Epic models to a display-friendly format for UI components.
 */

import type { Epic as V2Epic } from "../v2/generated";

/**
 * Unified epic display model for UI components.
 * Uses v2 API types with status normalized to lowercase.
 */
export interface EpicDisplay {
  /** Unique identifier (v2 public ID string) */
  id: string;
  /** Display key like "SPEC-E1" */
  displayKey: string;
  /** Epic title */
  title: string;
  /** Epic description */
  description?: string;
  /** Status string (normalized to lowercase) */
  status: string;
  /** Target date */
  targetDate?: Date;
  /** PRD file path */
  prdFilePath?: string;
  /** Epic file path */
  epicFilePath?: string;
  /** Dependency IDs (v2 public ID strings) */
  dependsOn?: string[];
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
}

/**
 * Map v2 status enum to lowercase string for UI display.
 */
const STATUS_MAP: Record<string, string> = {
  PLANNING: "planning",
  IN_PROGRESS: "active",
  COMPLETED: "completed",
};

/**
 * Convert v2 Epic to EpicDisplay.
 */
export function epicToDisplay(epic: V2Epic): EpicDisplay {
  const statusString = STATUS_MAP[epic.status] || "planning";

  return {
    id: epic.id,
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
  };
}

/**
 * Convert array of v2 Epics to EpicDisplay array.
 */
export function epicsToDisplay(epics: V2Epic[]): EpicDisplay[] {
  if (!Array.isArray(epics)) {
    console.error("[epicsToDisplay] Expected array, got:", typeof epics, epics);
    return [];
  }
  return epics.map((epic, index) => {
    try {
      return epicToDisplay(epic);
    } catch (err) {
      console.error(
        `[epicsToDisplay] Error converting epic at index ${index}:`,
        epic,
        err,
      );
      throw err;
    }
  });
}

// Backwards compatibility aliases (can be removed after migration)
export const v2EpicToDisplay = epicToDisplay;
export const v2EpicsToDisplay = epicsToDisplay;
