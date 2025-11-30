import { getDatabase } from '../db';
import { NotFoundError } from '../types';

export interface Epic {
  id: number;
  project_id: number;
  release_id: number | null;
  title: string;
  description: string | null;
  prd_file_path: string | null;
  epic_file_path: string | null;
  status: string;
  depends_on: string | null; // JSON array of epic IDs
  target_date: string | null;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface EpicWithStats extends Omit<Epic, 'depends_on'> {
  depends_on: number[]; // Parsed array for API response
  phase: number; // Computed phase based on dependencies
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
  release_id?: number | null;
  depends_on?: number[];
  target_date?: string | null;
}

export interface UpdateEpicInput {
  title?: string;
  description?: string | null;
  prd_file_path?: string | null;
  epic_file_path?: string | null;
  status?: string;
  release_id?: number | null;
  depends_on?: number[];
  target_date?: string | null;
}

/**
 * Calculate phase for an epic based on its dependencies
 */
function calculatePhase(epicId: number, epics: Map<number, { depends_on: number[] }>): number {
  const epic = epics.get(epicId);
  if (!epic) return 1;

  const deps = epic.depends_on;
  if (!deps || deps.length === 0) return 1;

  const depPhases = deps.map((depId) => calculatePhase(depId, epics));
  return Math.max(...depPhases) + 1;
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

  // Build a map for phase calculation
  const epicMap = new Map<number, { depends_on: number[] }>();
  for (const epic of epics) {
    const dependsOn: number[] = epic.depends_on ? (JSON.parse(epic.depends_on) as number[]) : [];
    epicMap.set(epic.id, { depends_on: dependsOn });
  }

  return epics.map((epic) => addEpicStats(epic, epicMap));
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
  const db = getDatabase();
  const epic = getEpicById(id);
  if (!epic) return null;

  // Get all epics in the same project to calculate phase
  const projectEpics = db
    .prepare('SELECT id, depends_on FROM epics WHERE project_id = ?')
    .all(epic.project_id) as { id: number; depends_on: string | null }[];

  const epicMap = new Map<number, { depends_on: number[] }>();
  for (const e of projectEpics) {
    const dependsOn: number[] = e.depends_on ? (JSON.parse(e.depends_on) as number[]) : [];
    epicMap.set(e.id, { depends_on: dependsOn });
  }

  return addEpicStats(epic, epicMap);
}

/**
 * Compute epic status dynamically based on task stats
 * - 'completed': All tasks are done/approved
 * - 'active': At least one task is in progress/pending_review
 * - 'planning': No tasks or all tasks are in backlog/ready states
 */
function computeEpicStatus(taskStats: {
  total: number;
  in_progress: number;
  done: number;
}): string {
  if (taskStats.total > 0 && taskStats.done === taskStats.total) {
    return 'completed';
  }
  if (taskStats.in_progress > 0) {
    return 'active';
  }
  return 'planning';
}

/**
 * Add task stats to an epic
 */
function addEpicStats(epic: Epic, epicMap: Map<number, { depends_on: number[] }>): EpicWithStats {
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

  // Parse depends_on and calculate phase
  const dependsOnParsed: number[] = epic.depends_on
    ? (JSON.parse(epic.depends_on) as number[])
    : [];
  const phase = calculatePhase(epic.id, epicMap);

  // Compute status dynamically based on task stats
  const computedStatus = computeEpicStatus(taskStats);

  return {
    ...epic,
    status: computedStatus,
    depends_on: dependsOnParsed,
    phase,
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
  const dependsOn = input.depends_on ? JSON.stringify(input.depends_on) : null;

  const result = db
    .prepare(
      `
      INSERT INTO epics (project_id, title, description, prd_file_path, epic_file_path, status, release_id, depends_on, target_date, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      projectId,
      input.title,
      input.description ?? null,
      input.prd_file_path ?? null,
      input.epic_file_path ?? null,
      status,
      input.release_id ?? null,
      dependsOn,
      input.target_date ?? null,
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
  const values: (string | number | null)[] = [];

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

  if (input.release_id !== undefined) {
    updates.push('release_id = ?');
    values.push(input.release_id);
  }

  if (input.depends_on !== undefined) {
    updates.push('depends_on = ?');
    values.push(input.depends_on ? JSON.stringify(input.depends_on) : null);
  }

  if (input.target_date !== undefined) {
    updates.push('target_date = ?');
    values.push(input.target_date);
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

  // Delete acceptance criteria (no cascade delete on schema)
  db.prepare("DELETE FROM acceptance_criteria WHERE entity_type = 'epic' AND entity_id = ?").run(
    id
  );

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
