import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';

export interface Project {
  id: number;
  project_id: string;
  name: string;
  local_path: string;
  git_remote: string | null;
  workflow_template: string;
  owner_user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectConfig {
  id: number;
  project_id: number;
  workflow_template: string;
  workflow_config: string | null;
  approval_config: string | null;
  default_pr_target_branch: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  name: string;
  local_path: string;
  git_remote?: string;
  workflow_template?: string;
}

export interface UpdateProjectInput {
  name?: string;
  local_path?: string;
  git_remote?: string | null;
  workflow_template?: string;
}

export interface UpdateProjectConfigInput {
  workflow_template?: string;
  workflow_config?: object;
  approval_config?: object;
}

/**
 * Generate a URL-friendly project ID from the name
 */
function generateProjectId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

/**
 * List all projects for a user
 */
export function listProjects(userId: number): Project[] {
  const db = getDatabase();
  return db
    .prepare(
      `
      SELECT p.* FROM projects p
      INNER JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.updated_at DESC
    `
    )
    .all(userId) as Project[];
}

/**
 * Get project by ID
 */
export function getProjectById(id: number): Project | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  return row ?? null;
}

/**
 * Create a new project
 */
export function createProject(input: CreateProjectInput, ownerUserId: number): Project {
  const db = getDatabase();
  const projectId = generateProjectId(input.name);
  const workflowTemplate = input.workflow_template ?? 'startup-fast';

  let result;
  try {
    result = db
      .prepare(
        `
        INSERT INTO projects (project_id, name, local_path, git_remote, workflow_template, owner_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        projectId,
        input.name,
        input.local_path,
        input.git_remote ?? null,
        workflowTemplate,
        ownerUserId
      );
  } catch (err: unknown) {
    // Handle unique constraint violation from better-sqlite3
    const sqliteErr = err as { code?: string };
    if (sqliteErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new ValidationError(`A project named "${input.name}" already exists`);
    }
    throw err;
  }

  const newProjectId = result.lastInsertRowid as number;

  // Auto-add owner as project member with 'owner' role
  db.prepare(
    `
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, 'owner')
  `
  ).run(newProjectId, ownerUserId);

  // Create default project config
  db.prepare(
    `
    INSERT INTO project_config (project_id, workflow_template)
    VALUES (?, ?)
  `
  ).run(newProjectId, workflowTemplate);

  return getProjectById(newProjectId)!;
}

/**
 * Update project
 */
export function updateProject(id: number, input: UpdateProjectInput): Project {
  const db = getDatabase();
  const project = getProjectById(id);

  if (!project) {
    throw new NotFoundError('Project', id);
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }

  if (input.local_path !== undefined) {
    updates.push('local_path = ?');
    values.push(input.local_path);
  }

  if (input.git_remote !== undefined) {
    updates.push('git_remote = ?');
    values.push(input.git_remote);
  }

  if (input.workflow_template !== undefined) {
    updates.push('workflow_template = ?');
    values.push(input.workflow_template);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getProjectById(id)!;
}

/**
 * Delete project
 */
export function deleteProject(id: number): void {
  const db = getDatabase();
  const project = getProjectById(id);

  if (!project) {
    throw new NotFoundError('Project', id);
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

/**
 * Get project config
 */
export function getProjectConfig(projectId: number): ProjectConfig | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM project_config WHERE project_id = ?').get(projectId) as
    | ProjectConfig
    | undefined;
  return row ?? null;
}

/**
 * Update project config
 */
export function updateProjectConfig(
  projectId: number,
  input: UpdateProjectConfigInput
): ProjectConfig {
  const db = getDatabase();
  let config = getProjectConfig(projectId);

  if (!config) {
    // Create config if it doesn't exist
    db.prepare(
      `
      INSERT INTO project_config (project_id, workflow_template)
      VALUES (?, 'startup-fast')
    `
    ).run(projectId);
    config = getProjectConfig(projectId)!;
  }

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (input.workflow_template !== undefined) {
    updates.push('workflow_template = ?');
    values.push(input.workflow_template);
  }

  if (input.workflow_config !== undefined) {
    updates.push('workflow_config = ?');
    values.push(JSON.stringify(input.workflow_config));
  }

  if (input.approval_config !== undefined) {
    updates.push('approval_config = ?');
    values.push(JSON.stringify(input.approval_config));
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE project_config SET ${updates.join(', ')} WHERE project_id = ?`).run(
      ...values,
      projectId
    );
  }

  return getProjectConfig(projectId)!;
}

/**
 * Check if user has access to project
 */
export function userHasProjectAccess(projectId: number, userId: number): boolean {
  const db = getDatabase();
  const row = db
    .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(projectId, userId);
  return !!row;
}

/**
 * Get dashboard data for a project
 */
export function getProjectDashboard(projectId: number): {
  active_tasks: number;
  pending_review: number;
  total_tasks: number;
  notifications_count: number;
} {
  const db = getDatabase();

  const activeTasks = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = 'in_progress'")
    .get(projectId) as { count: number };

  const pendingReview = db
    .prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND status = 'pending_review'"
    )
    .get(projectId) as { count: number };

  const totalTasks = db
    .prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?')
    .get(projectId) as {
    count: number;
  };

  const notifications = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE project_id = ? AND is_read = 0')
    .get(projectId) as { count: number };

  return {
    active_tasks: activeTasks.count,
    pending_review: pendingReview.count,
    total_tasks: totalTasks.count,
    notifications_count: notifications.count,
  };
}

/**
 * Get project statistics
 */
export function getProjectStats(projectId: number): {
  tasks_by_status: Record<string, number>;
  epics_count: number;
  repositories_count: number;
  completion_rate: number;
} {
  const db = getDatabase();

  const tasksByStatus = db
    .prepare(
      `
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE project_id = ?
      GROUP BY status
    `
    )
    .all(projectId) as { status: string; count: number }[];

  const statusMap: Record<string, number> = {};
  let totalTasks = 0;
  let doneTasks = 0;

  for (const row of tasksByStatus) {
    statusMap[row.status] = row.count;
    totalTasks += row.count;
    if (row.status === 'done') {
      doneTasks = row.count;
    }
  }

  const epicsCount = db
    .prepare('SELECT COUNT(*) as count FROM epics WHERE project_id = ?')
    .get(projectId) as {
    count: number;
  };

  const reposCount = db
    .prepare('SELECT COUNT(*) as count FROM repositories WHERE project_id = ?')
    .get(projectId) as {
    count: number;
  };

  return {
    tasks_by_status: statusMap,
    epics_count: epicsCount.count,
    repositories_count: reposCount.count,
    completion_rate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
  };
}
