import { getDatabase } from '../db';
import { NotFoundError, ValidationError } from '../types';

export interface Task {
  id: number;
  project_id: number;
  epic_id: number | null;
  title: string;
  description: string | null;
  status: string;
  requires_approval: boolean;
  repo_name: string | null;
  agent_name: string | null;
  progress_percentage: number;
  estimated_duration: number | null;
  actual_duration: number | null;
  github_issue_number: number | null;
  github_branch_name: string | null;
  github_pr_number: number | null;
  file_path: string | null;
  created_by_user_id: number;
  assigned_to_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  depends_on_task?: {
    id: number;
    title: string;
    status: string;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  epic_id?: number;
  requires_approval?: boolean;
  repo_name?: string;
  agent_name?: string;
  estimated_duration?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  epic_id?: number | null;
  status?: string;
  requires_approval?: boolean;
  repo_name?: string | null;
  agent_name?: string | null;
  progress_percentage?: number;
  estimated_duration?: number | null;
  actual_duration?: number | null;
  github_issue_number?: number | null;
  github_branch_name?: string | null;
  github_pr_number?: number | null;
  file_path?: string | null;
}

export interface TaskFilters {
  status?: string;
  epic_id?: number;
  assigned_to_user_id?: number;
  search?: string;
}

/**
 * List tasks for a project with optional filters
 */
export function listTasks(
  projectId: number,
  filters?: TaskFilters,
  pagination?: { page: number; limit: number }
): { tasks: Task[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ['project_id = ?'];
  const values: (string | number)[] = [projectId];

  if (filters?.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters?.epic_id) {
    conditions.push('epic_id = ?');
    values.push(filters.epic_id);
  }

  if (filters?.assigned_to_user_id) {
    conditions.push('assigned_to_user_id = ?');
    values.push(filters.assigned_to_user_id);
  }

  if (filters?.search) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    values.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${whereClause}`)
    .get(...values) as {
    count: number;
  };

  // Get paginated results
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 20;
  const offset = (page - 1) * limit;

  const tasks = db
    .prepare(
      `
      SELECT * FROM tasks
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(...values, limit, offset) as Task[];

  return { tasks, total: countResult.count };
}

/**
 * Get task by ID
 */
export function getTaskById(id: number): Task | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
  return row ?? null;
}

/**
 * Create a new task
 */
export function createTask(
  projectId: number,
  input: CreateTaskInput,
  createdByUserId: number
): Task {
  const db = getDatabase();

  const result = db
    .prepare(
      `
      INSERT INTO tasks (
        project_id, epic_id, title, description, requires_approval,
        repo_name, agent_name, estimated_duration, created_by_user_id, assigned_to_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      projectId,
      input.epic_id ?? null,
      input.title,
      input.description ?? null,
      input.requires_approval ?? true,
      input.repo_name ?? null,
      input.agent_name ?? null,
      input.estimated_duration ?? null,
      createdByUserId,
      createdByUserId // Default assign to creator
    );

  return getTaskById(result.lastInsertRowid as number)!;
}

/**
 * Update task
 */
export function updateTask(id: number, input: UpdateTaskInput): Task {
  const db = getDatabase();
  const task = getTaskById(id);

  if (!task) {
    throw new NotFoundError('Task', id);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fields: (keyof UpdateTaskInput)[] = [
    'title',
    'description',
    'epic_id',
    'status',
    'requires_approval',
    'repo_name',
    'agent_name',
    'progress_percentage',
    'estimated_duration',
    'actual_duration',
    'github_issue_number',
    'github_branch_name',
    'github_pr_number',
    'file_path',
  ];

  for (const field of fields) {
    if (input[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(input[field] as string | number | null);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values, id);
  }

  return getTaskById(id)!;
}

/**
 * Delete task
 */
export function deleteTask(id: number): void {
  const db = getDatabase();
  const task = getTaskById(id);

  if (!task) {
    throw new NotFoundError('Task', id);
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

/**
 * Assign task to user
 */
export function assignTask(id: number, userId: number | null): Task {
  const db = getDatabase();
  const task = getTaskById(id);

  if (!task) {
    throw new NotFoundError('Task', id);
  }

  db.prepare(
    'UPDATE tasks SET assigned_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(userId, id);

  return getTaskById(id)!;
}

/**
 * Get task dependencies
 */
export function getTaskDependencies(taskId: number): TaskDependency[] {
  const db = getDatabase();

  return db
    .prepare(
      `
      SELECT
        td.id,
        td.task_id,
        td.depends_on_task_id,
        t.id as dep_id,
        t.title as dep_title,
        t.status as dep_status
      FROM task_dependencies td
      INNER JOIN tasks t ON t.id = td.depends_on_task_id
      WHERE td.task_id = ?
    `
    )
    .all(taskId)
    .map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: r['id'] as number,
        task_id: r['task_id'] as number,
        depends_on_task_id: r['depends_on_task_id'] as number,
        depends_on_task: {
          id: r['dep_id'] as number,
          title: r['dep_title'] as string,
          status: r['dep_status'] as string,
        },
      };
    });
}

/**
 * Add task dependency
 */
export function addTaskDependency(taskId: number, dependsOnTaskId: number): TaskDependency {
  const db = getDatabase();

  // Validate both tasks exist
  const task = getTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  const dependsOnTask = getTaskById(dependsOnTaskId);
  if (!dependsOnTask) {
    throw new NotFoundError('Task', dependsOnTaskId);
  }

  // Check for self-dependency
  if (taskId === dependsOnTaskId) {
    throw new ValidationError('A task cannot depend on itself');
  }

  // Check for circular dependencies (simple check - would need graph traversal for complex cases)
  const existingDeps = getTaskDependencies(dependsOnTaskId);
  const wouldBeCircular = existingDeps.some((d) => d.depends_on_task_id === taskId);
  if (wouldBeCircular) {
    throw new ValidationError('Adding this dependency would create a circular reference');
  }

  try {
    const result = db
      .prepare(
        `
        INSERT INTO task_dependencies (task_id, depends_on_task_id)
        VALUES (?, ?)
      `
      )
      .run(taskId, dependsOnTaskId);

    return {
      id: result.lastInsertRowid as number,
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
      depends_on_task: {
        id: dependsOnTask.id,
        title: dependsOnTask.title,
        status: dependsOnTask.status,
      },
    };
  } catch {
    throw new ValidationError('Dependency already exists');
  }
}

/**
 * Remove task dependency
 */
export function removeTaskDependency(taskId: number, dependencyId: number): void {
  const db = getDatabase();

  const result = db
    .prepare('DELETE FROM task_dependencies WHERE id = ? AND task_id = ?')
    .run(dependencyId, taskId);

  if (result.changes === 0) {
    throw new NotFoundError('TaskDependency', dependencyId);
  }
}

/**
 * Submit task review
 */
export function submitTaskReview(
  taskId: number,
  reviewerUserId: number,
  decision: 'approve' | 'request_changes',
  feedback?: string
): Task {
  const db = getDatabase();
  const task = getTaskById(taskId);

  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  if (task.status !== 'pending_review') {
    throw new ValidationError('Task is not pending review');
  }

  // Record approval
  db.prepare(
    `
    INSERT INTO approvals (task_id, reviewer_user_id, decision, feedback)
    VALUES (?, ?, ?, ?)
  `
  ).run(taskId, reviewerUserId, decision, feedback ?? null);

  // Update task status
  const newStatus = decision === 'approve' ? 'approved' : 'ready';

  db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    newStatus,
    taskId
  );

  // If approved, check for dependent tasks to unblock
  if (decision === 'approve') {
    unblockDependentTasks(taskId);
  }

  return getTaskById(taskId)!;
}

/**
 * Unblock tasks that depend on the completed task
 */
function unblockDependentTasks(completedTaskId: number): void {
  const db = getDatabase();

  // Find tasks that depend on this task
  const dependentTaskIds = db
    .prepare(
      `
      SELECT DISTINCT task_id FROM task_dependencies
      WHERE depends_on_task_id = ?
    `
    )
    .all(completedTaskId) as { task_id: number }[];

  for (const { task_id } of dependentTaskIds) {
    // Check if all dependencies are now complete
    const blockingDeps = db
      .prepare(
        `
        SELECT COUNT(*) as count FROM task_dependencies td
        INNER JOIN tasks t ON t.id = td.depends_on_task_id
        WHERE td.task_id = ? AND t.status NOT IN ('approved', 'done')
      `
      )
      .get(task_id) as { count: number };

    if (blockingDeps.count === 0) {
      // All dependencies complete - move to ready if in backlog
      db.prepare(
        `
        UPDATE tasks SET status = 'ready', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'backlog'
      `
      ).run(task_id);
    }
  }
}

/**
 * Check if task is blocked by incomplete dependencies
 */
export function isTaskBlocked(taskId: number): boolean {
  const db = getDatabase();

  const blockingDeps = db
    .prepare(
      `
      SELECT COUNT(*) as count FROM task_dependencies td
      INNER JOIN tasks t ON t.id = td.depends_on_task_id
      WHERE td.task_id = ? AND t.status NOT IN ('approved', 'done')
    `
    )
    .get(taskId) as { count: number };

  return blockingDeps.count > 0;
}
