import { getDatabase } from '../db';
import { NotFoundError } from '../types';

export interface Notification {
  id: number;
  project_id: number;
  user_id: number;
  type: string;
  title: string;
  message: string | null;
  task_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  type: string;
  title: string;
  message?: string;
  task_id?: number;
}

/**
 * List notifications for a project and user
 */
export function listNotifications(
  projectId: number,
  userId: number,
  options?: { unreadOnly?: boolean; limit?: number }
): Notification[] {
  const db = getDatabase();

  let query = `
    SELECT * FROM notifications
    WHERE project_id = ? AND user_id = ?
  `;

  const values: (number | string)[] = [projectId, userId];

  if (options?.unreadOnly) {
    query += ' AND is_read = 0';
  }

  query += ' ORDER BY created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    values.push(options.limit);
  }

  return db.prepare(query).all(...values) as Notification[];
}

/**
 * Get notification by ID
 */
export function getNotificationById(id: number): Notification | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as
    | Notification
    | undefined;
  return row ?? null;
}

/**
 * Create a notification
 */
export function createNotification(
  projectId: number,
  userId: number,
  input: CreateNotificationInput
): Notification {
  const db = getDatabase();

  const result = db
    .prepare(
      `
      INSERT INTO notifications (project_id, user_id, type, title, message, task_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    .run(projectId, userId, input.type, input.title, input.message ?? null, input.task_id ?? null);

  return getNotificationById(result.lastInsertRowid as number)!;
}

/**
 * Mark notification as read
 */
export function markNotificationRead(id: number): Notification {
  const db = getDatabase();
  const notification = getNotificationById(id);

  if (!notification) {
    throw new NotFoundError('Notification', id);
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

  return getNotificationById(id)!;
}

/**
 * Mark all notifications as read for a project and user
 */
export function markAllNotificationsRead(projectId: number, userId: number): number {
  const db = getDatabase();

  const result = db
    .prepare(
      'UPDATE notifications SET is_read = 1 WHERE project_id = ? AND user_id = ? AND is_read = 0'
    )
    .run(projectId, userId);

  return result.changes;
}

/**
 * Delete notification
 */
export function deleteNotification(id: number): void {
  const db = getDatabase();
  const notification = getNotificationById(id);

  if (!notification) {
    throw new NotFoundError('Notification', id);
  }

  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
}

/**
 * Get unread notification count for a user across all projects
 */
export function getUnreadCount(userId: number): number {
  const db = getDatabase();
  const result = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { count: number };
  return result.count;
}
