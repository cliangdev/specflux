/**
 * Utilities for handling v1 (numeric) and v2 (string) IDs during migration.
 *
 * v1 IDs: Numeric IDs from the legacy SQLite backend (e.g., 1, 42, 123)
 * v2 IDs: String IDs from the new backend (e.g., "proj_xxx", "task_xxx", "epic_xxx")
 *
 * During the migration period, both ID formats may be present. These utilities
 * help detect v2 IDs to skip v1 API calls that would fail with string IDs.
 */

/**
 * Check if an ID is a v2 ID (string format like "proj_xxx", "task_xxx", etc.)
 *
 * @param id - The ID to check (can be number, string, undefined, or null)
 * @returns true if the ID is a v2 string ID, false if it's a v1 numeric ID
 *
 * @example
 * isV2Id(123)           // false - numeric v1 ID
 * isV2Id("123")         // false - stringified numeric v1 ID
 * isV2Id("task_abc123") // true - v2 task ID
 * isV2Id("proj_xyz")    // true - v2 project ID
 * isV2Id(undefined)     // false
 */
export function isV2Id(id: number | string | undefined | null): boolean {
  if (id === undefined || id === null) return false;
  const strId = String(id);
  return (
    strId.startsWith("proj_") ||
    strId.startsWith("task_") ||
    strId.startsWith("epic_") ||
    isNaN(Number(id))
  );
}

/**
 * Check if a task ID is a v2 ID.
 * Alias for isV2Id with clearer semantics for task-specific contexts.
 *
 * @param taskId - The task ID to check
 * @returns true if the ID is a v2 task ID
 */
export function isV2TaskId(taskId: string | undefined): boolean {
  return isV2Id(taskId);
}

/**
 * Check if a project ID is a v2 ID.
 * Alias for isV2Id with clearer semantics for project-specific contexts.
 *
 * @param projectId - The project ID to check
 * @returns true if the ID is a v2 project ID
 */
export function isV2ProjectId(projectId: number | string | undefined): boolean {
  return isV2Id(projectId);
}

/**
 * Check if an epic ID is a v2 ID.
 * Alias for isV2Id with clearer semantics for epic-specific contexts.
 *
 * @param epicId - The epic ID to check
 * @returns true if the ID is a v2 epic ID
 */
export function isV2EpicId(epicId: number | string | undefined): boolean {
  return isV2Id(epicId);
}
