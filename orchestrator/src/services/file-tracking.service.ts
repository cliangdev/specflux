/**
 * File Tracking Service
 *
 * Tracks file changes made during agent sessions and stores them in the database.
 * Used to display what files were modified by an agent during a task.
 */

import { getDatabase } from '../db';

export interface FileChange {
  id: number;
  taskId: number;
  sessionId: number | null;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  diffSummary: string | null;
  createdAt: string;
}

export interface FileChangeInput {
  taskId: number;
  sessionId: number | null;
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  diffSummary?: string;
}

/**
 * Record a file change for a task
 */
export function recordFileChange(input: FileChangeInput): FileChange {
  const db = getDatabase();

  // Check if we already have this file change recorded for the same task/session
  const existing = db
    .prepare(
      `SELECT id FROM task_file_changes
       WHERE task_id = ? AND session_id IS ? AND file_path = ?`
    )
    .get(input.taskId, input.sessionId, input.filePath) as { id: number } | undefined;

  if (existing) {
    // Update existing record with new change type
    db.prepare(
      `UPDATE task_file_changes
       SET change_type = ?, diff_summary = COALESCE(?, diff_summary), created_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(input.changeType, input.diffSummary ?? null, existing.id);

    return getFileChange(existing.id)!;
  }

  // Insert new record
  const result = db
    .prepare(
      `INSERT INTO task_file_changes (task_id, session_id, file_path, change_type, diff_summary)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.taskId,
      input.sessionId,
      input.filePath,
      input.changeType,
      input.diffSummary ?? null
    );

  return getFileChange(result.lastInsertRowid as number)!;
}

/**
 * Get a single file change by ID
 */
export function getFileChange(id: number): FileChange | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM task_file_changes WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  if (!row) return null;

  return mapRowToFileChange(row);
}

/**
 * Get all file changes for a task
 */
export function getFileChangesForTask(taskId: number): FileChange[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM task_file_changes
       WHERE task_id = ?
       ORDER BY created_at DESC`
    )
    .all(taskId) as Record<string, unknown>[];

  return rows.map(mapRowToFileChange);
}

/**
 * Get file changes for a specific session
 */
export function getFileChangesForSession(sessionId: number): FileChange[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM task_file_changes
       WHERE session_id = ?
       ORDER BY created_at DESC`
    )
    .all(sessionId) as Record<string, unknown>[];

  return rows.map(mapRowToFileChange);
}

/**
 * Get summary of file changes for a task
 */
export function getFileChangeSummary(taskId: number): {
  total: number;
  created: number;
  modified: number;
  deleted: number;
} {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN change_type = 'created' THEN 1 ELSE 0 END) as created,
         SUM(CASE WHEN change_type = 'modified' THEN 1 ELSE 0 END) as modified,
         SUM(CASE WHEN change_type = 'deleted' THEN 1 ELSE 0 END) as deleted
       FROM task_file_changes
       WHERE task_id = ?`
    )
    .get(taskId) as Record<string, number>;

  return {
    total: row['total'] ?? 0,
    created: row['created'] ?? 0,
    modified: row['modified'] ?? 0,
    deleted: row['deleted'] ?? 0,
  };
}

/**
 * Delete all file changes for a task
 */
export function deleteFileChangesForTask(taskId: number): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM task_file_changes WHERE task_id = ?').run(taskId);
  return result.changes;
}

/**
 * Delete all file changes for a session
 */
export function deleteFileChangesForSession(sessionId: number): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM task_file_changes WHERE session_id = ?').run(sessionId);
  return result.changes;
}

/**
 * Update diff summary for a file change
 */
export function updateDiffSummary(id: number, diffSummary: string): void {
  const db = getDatabase();
  db.prepare('UPDATE task_file_changes SET diff_summary = ? WHERE id = ?').run(diffSummary, id);
}

/**
 * Map database row to FileChange object
 */
function mapRowToFileChange(row: Record<string, unknown>): FileChange {
  return {
    id: row['id'] as number,
    taskId: row['task_id'] as number,
    sessionId: row['session_id'] as number | null,
    filePath: row['file_path'] as string,
    changeType: row['change_type'] as 'created' | 'modified' | 'deleted',
    diffSummary: row['diff_summary'] as string | null,
    createdAt: row['created_at'] as string,
  };
}
