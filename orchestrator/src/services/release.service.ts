import { getDatabase } from '../db';
import { NotFoundError } from '../types';

export interface Release {
  id: number;
  project_id: number;
  name: string;
  target_date: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseWithStats extends Release {
  epic_count: number;
  progress_percentage: number;
}

export interface CreateReleaseInput {
  name: string;
  target_date?: string | null;
  description?: string | null;
}

export interface UpdateReleaseInput {
  name?: string;
  target_date?: string | null;
  status?: string;
  description?: string | null;
}

export interface ReleasePhase {
  phase_number: number;
  status: 'ready' | 'in_progress' | 'blocked' | 'completed';
  epic_ids: number[];
  completed_count: number;
  total_count: number;
}

export interface EpicWithPhase {
  id: number;
  project_id: number;
  release_id: number | null;
  title: string;
  description: string | null;
  status: string;
  depends_on: number[];
  target_date: string | null;
  phase: number;
  progress_percentage: number;
  task_stats: {
    total: number;
    done: number;
    in_progress: number;
  };
}

/**
 * List all releases for a project
 */
export function listReleases(projectId: number, status?: string): ReleaseWithStats[] {
  const db = getDatabase();

  let query = `
    SELECT * FROM releases
    WHERE project_id = ?
  `;
  const params: (number | string)[] = [projectId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY target_date ASC, created_at DESC';

  const releases = db.prepare(query).all(...params) as Release[];
  return releases.map((release) => addReleaseStats(release));
}

/**
 * Get release by ID
 */
export function getReleaseById(id: number): Release | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM releases WHERE id = ?').get(id) as Release | undefined;
  return row ?? null;
}

/**
 * Get release with stats
 */
export function getReleaseWithStats(id: number): ReleaseWithStats | null {
  const release = getReleaseById(id);
  if (!release) return null;
  return addReleaseStats(release);
}

/**
 * Add epic stats to a release
 */
function addReleaseStats(release: Release): ReleaseWithStats {
  const db = getDatabase();

  // Count epics and calculate progress
  const epicStats = db
    .prepare(
      `
      SELECT COUNT(*) as epic_count
      FROM epics
      WHERE release_id = ?
    `
    )
    .get(release.id) as { epic_count: number };

  // Calculate overall progress from tasks in epics belonging to this release
  const taskStats = db
    .prepare(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN t.status IN ('done', 'approved') THEN 1 ELSE 0 END) as done
      FROM tasks t
      JOIN epics e ON t.epic_id = e.id
      WHERE e.release_id = ?
    `
    )
    .get(release.id) as { total: number; done: number };

  const progressPercentage =
    taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return {
    ...release,
    epic_count: epicStats.epic_count,
    progress_percentage: progressPercentage,
  };
}

/**
 * Create a new release
 */
export function createRelease(projectId: number, input: CreateReleaseInput): Release {
  const db = getDatabase();

  const result = db
    .prepare(
      `
      INSERT INTO releases (project_id, name, target_date, description)
      VALUES (?, ?, ?, ?)
    `
    )
    .run(projectId, input.name, input.target_date ?? null, input.description ?? null);

  return getReleaseById(result.lastInsertRowid as number)!;
}

/**
 * Update release
 */
export function updateRelease(id: number, input: UpdateReleaseInput): Release {
  const db = getDatabase();
  const release = getReleaseById(id);

  if (!release) {
    throw new NotFoundError('Release', id);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }

  if (input.target_date !== undefined) {
    updates.push('target_date = ?');
    values.push(input.target_date);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE releases SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getReleaseById(id)!;
}

/**
 * Delete release (epics are unassigned, not deleted)
 */
export function deleteRelease(id: number): void {
  const db = getDatabase();
  const release = getReleaseById(id);

  if (!release) {
    throw new NotFoundError('Release', id);
  }

  // Unlink epics from this release (don't delete them)
  db.prepare('UPDATE epics SET release_id = NULL WHERE release_id = ?').run(id);

  db.prepare('DELETE FROM releases WHERE id = ?').run(id);
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
 * Get release roadmap with epics grouped by phase
 */
export function getReleaseRoadmap(
  releaseId: number
): { release: ReleaseWithStats; epics: EpicWithPhase[]; phases: ReleasePhase[] } | null {
  const db = getDatabase();
  const release = getReleaseWithStats(releaseId);

  if (!release) {
    return null;
  }

  // Get all epics in this release
  const rawEpics = db
    .prepare(
      `
      SELECT id, project_id, release_id, title, description, status, depends_on, target_date
      FROM epics
      WHERE release_id = ?
    `
    )
    .all(releaseId) as {
    id: number;
    project_id: number;
    release_id: number | null;
    title: string;
    description: string | null;
    status: string;
    depends_on: string | null;
    target_date: string | null;
  }[];

  // Build a map for phase calculation
  const epicMap = new Map<number, { depends_on: number[] }>();
  for (const epic of rawEpics) {
    const dependsOn: number[] = epic.depends_on ? (JSON.parse(epic.depends_on) as number[]) : [];
    epicMap.set(epic.id, { depends_on: dependsOn });
  }

  // Calculate phases and task stats for each epic
  const epicsWithPhase: EpicWithPhase[] = rawEpics.map((epic) => {
    const dependsOn: number[] = epic.depends_on ? (JSON.parse(epic.depends_on) as number[]) : [];
    const phase = calculatePhase(epic.id, epicMap);

    // Get task stats
    const taskStats = db
      .prepare(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('done', 'approved') THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN status IN ('in_progress', 'pending_review') THEN 1 ELSE 0 END) as in_progress
        FROM tasks
        WHERE epic_id = ?
      `
      )
      .get(epic.id) as { total: number; done: number; in_progress: number };

    return {
      id: epic.id,
      project_id: epic.project_id,
      release_id: epic.release_id,
      title: epic.title,
      description: epic.description,
      status: epic.status,
      depends_on: dependsOn,
      target_date: epic.target_date,
      phase,
      progress_percentage:
        taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0,
      task_stats: {
        total: taskStats.total,
        done: taskStats.done,
        in_progress: taskStats.in_progress,
      },
    };
  });

  // Group epics by phase
  const phaseMap = new Map<number, EpicWithPhase[]>();
  for (const epic of epicsWithPhase) {
    const existing = phaseMap.get(epic.phase) ?? [];
    existing.push(epic);
    phaseMap.set(epic.phase, existing);
  }

  // Build phase summary
  const phases: ReleasePhase[] = [];
  const sortedPhaseNumbers = Array.from(phaseMap.keys()).sort((a, b) => a - b);

  for (const phaseNum of sortedPhaseNumbers) {
    const phaseEpics = phaseMap.get(phaseNum)!;
    const completedCount = phaseEpics.filter((e) => e.status === 'completed').length;
    const totalCount = phaseEpics.length;

    // Check if any epic has work in progress (tasks done or in progress)
    const hasWorkInProgress = phaseEpics.some(
      (e) =>
        e.status === 'active' ||
        e.task_stats.in_progress > 0 ||
        (e.task_stats.done > 0 && e.task_stats.done < e.task_stats.total)
    );

    // Check if any epic has all tasks done (even if status is still 'planning')
    const hasEpicWithAllTasksDone = phaseEpics.some(
      (e) => e.task_stats.total > 0 && e.task_stats.done === e.task_stats.total
    );

    // Determine phase status
    let status: ReleasePhase['status'] = 'blocked';
    if (completedCount === totalCount) {
      status = 'completed';
    } else if (hasWorkInProgress || hasEpicWithAllTasksDone) {
      status = 'in_progress';
    } else if (phaseNum === 1 || phases[phases.length - 1]?.status === 'completed') {
      status = 'ready';
    }

    phases.push({
      phase_number: phaseNum,
      status,
      epic_ids: phaseEpics.map((e) => e.id),
      completed_count: completedCount,
      total_count: totalCount,
    });
  }

  return {
    release,
    epics: epicsWithPhase,
    phases,
  };
}
