import { getDatabase } from '../db';
import { NotFoundError } from '../types';

export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  prd_file_path: string | null;
  epic_file_path: string | null;
  status: string;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface EpicWithStats extends Epic {
  task_stats: {
    total: number;
    backlog: number;
    in_progress: number;
    done: number;
  };
  progress_percentage: number;
}

export interface CreateEpicInput {
  title: string;
  description?: string;
  prd_file_path?: string;
  epic_file_path?: string;
  status?: string;
}

export interface UpdateEpicInput {
  title?: string;
  description?: string | null;
  prd_file_path?: string | null;
  epic_file_path?: string | null;
  status?: string;
}

/**
 * List all epics for a project
 */
export function listEpics(projectId: number): EpicWithStats[] {
  const db = getDatabase();
  const epics = db
    .prepare(
      `
      SELECT * FROM epics
      WHERE project_id = ?
      ORDER BY created_at DESC
    `
    )
    .all(projectId) as Epic[];

  return epics.map((epic) => addEpicStats(epic));
}

/**
 * Get epic by ID
 */
export function getEpicById(id: number): Epic | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM epics WHERE id = ?').get(id) as Epic | undefined;
  return row ?? null;
}

/**
 * Get epic with stats
 */
export function getEpicWithStats(id: number): EpicWithStats | null {
  const epic = getEpicById(id);
  if (!epic) return null;
  return addEpicStats(epic);
}

/**
 * Add task stats to an epic
 */
function addEpicStats(epic: Epic): EpicWithStats {
  const db = getDatabase();

  const stats = db
    .prepare(
      `
      SELECT
        status,
        COUNT(*) as count
      FROM tasks
      WHERE epic_id = ?
      GROUP BY status
    `
    )
    .all(epic.id) as { status: string; count: number }[];

  const taskStats = {
    total: 0,
    backlog: 0,
    in_progress: 0,
    done: 0,
  };

  for (const row of stats) {
    taskStats.total += row.count;
    if (row.status === 'backlog' || row.status === 'ready') {
      taskStats.backlog += row.count;
    } else if (row.status === 'in_progress' || row.status === 'pending_review') {
      taskStats.in_progress += row.count;
    } else if (row.status === 'approved' || row.status === 'done') {
      taskStats.done += row.count;
    }
  }

  const progressPercentage =
    taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return {
    ...epic,
    task_stats: taskStats,
    progress_percentage: progressPercentage,
  };
}

/**
 * Create a new epic
 */
export function createEpic(
  projectId: number,
  input: CreateEpicInput,
  createdByUserId: number
): Epic {
  const db = getDatabase();
  const status = input.status ?? 'planning';

  const result = db
    .prepare(
      `
      INSERT INTO epics (project_id, title, description, prd_file_path, epic_file_path, status, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      projectId,
      input.title,
      input.description ?? null,
      input.prd_file_path ?? null,
      input.epic_file_path ?? null,
      status,
      createdByUserId
    );

  return getEpicById(result.lastInsertRowid as number)!;
}

/**
 * Update epic
 */
export function updateEpic(id: number, input: UpdateEpicInput): Epic {
  const db = getDatabase();
  const epic = getEpicById(id);

  if (!epic) {
    throw new NotFoundError('Epic', id);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }

  if (input.prd_file_path !== undefined) {
    updates.push('prd_file_path = ?');
    values.push(input.prd_file_path);
  }

  if (input.epic_file_path !== undefined) {
    updates.push('epic_file_path = ?');
    values.push(input.epic_file_path);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE epics SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getEpicById(id)!;
}

/**
 * Delete epic
 */
export function deleteEpic(id: number): void {
  const db = getDatabase();
  const epic = getEpicById(id);

  if (!epic) {
    throw new NotFoundError('Epic', id);
  }

  // Unlink tasks from this epic (don't delete them)
  db.prepare('UPDATE tasks SET epic_id = NULL WHERE epic_id = ?').run(id);

  db.prepare('DELETE FROM epics WHERE id = ?').run(id);
}

/**
 * Get tasks for an epic
 */
export function getEpicTasks(epicId: number): {
  id: number;
  title: string;
  status: string;
  progress_percentage: number;
  assigned_to_user_id: number | null;
}[] {
  const db = getDatabase();

  return db
    .prepare(
      `
      SELECT id, title, status, progress_percentage, assigned_to_user_id
      FROM tasks
      WHERE epic_id = ?
      ORDER BY id ASC
    `
    )
    .all(epicId) as {
    id: number;
    title: string;
    status: string;
    progress_percentage: number;
    assigned_to_user_id: number | null;
  }[];
}

/**
 * Get epic progress details
 */
export function getEpicProgress(epicId: number): {
  total_tasks: number;
  tasks_by_status: Record<string, number>;
  progress_percentage: number;
  estimated_remaining_minutes: number;
} {
  const db = getDatabase();

  const stats = db
    .prepare(
      `
      SELECT
        status,
        COUNT(*) as count,
        SUM(COALESCE(estimated_duration, 0)) as estimated_minutes
      FROM tasks
      WHERE epic_id = ?
      GROUP BY status
    `
    )
    .all(epicId) as { status: string; count: number; estimated_minutes: number }[];

  const tasksByStatus: Record<string, number> = {};
  let totalTasks = 0;
  let doneTasks = 0;
  let remainingMinutes = 0;

  for (const row of stats) {
    tasksByStatus[row.status] = row.count;
    totalTasks += row.count;

    if (row.status === 'done' || row.status === 'approved') {
      doneTasks += row.count;
    } else {
      remainingMinutes += row.estimated_minutes;
    }
  }

  return {
    total_tasks: totalTasks,
    tasks_by_status: tasksByStatus,
    progress_percentage: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    estimated_remaining_minutes: remainingMinutes,
  };
}
