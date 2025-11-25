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
  blocked_by_count: number;
  estimated_duration: number | null;
  actual_duration: number | null;
  github_issue_number: number | null;
  github_branch_name: string | null;
  github_pr_number: number | null;
  github_pr_url: string | null;
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
  github_pr_url?: string | null;
  file_path?: string | null;
}

export interface TaskFilters {
  status?: string;
  epic_id?: number;
  assigned_to_user_id?: number;
  search?: string;
}

export type TaskSortField =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'status'
  | 'progress_percentage';
export type SortOrder = 'asc' | 'desc';

export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  sort: TaskSortField;
  order: SortOrder;
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    prev_cursor: string | null;
    has_more: boolean;
    total: number;
  };
}

/**
 * Encode cursor as base64 JSON
 */
function encodeCursor(id: number, sortValue: string | number): string {
  return Buffer.from(JSON.stringify({ id, sortValue })).toString('base64');
}

/**
 * Decode cursor from base64 JSON
 */
function decodeCursor(cursor: string): { id: number; sortValue: string | number } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { id: number; sortValue: string | number };
    return parsed;
  } catch {
    return null;
  }
}

/**
 * List tasks for a project with optional filters (cursor-based pagination)
 */
export function listTasks(
  projectId: number,
  filters?: TaskFilters,
  paginationOpts?: CursorPaginationOptions
): CursorPaginationResult<Task> {
  const db = getDatabase();
  const conditions: string[] = ['t.project_id = ?'];
  const values: (string | number)[] = [projectId];

  if (filters?.status) {
    conditions.push('t.status = ?');
    values.push(filters.status);
  }

  if (filters?.epic_id) {
    conditions.push('t.epic_id = ?');
    values.push(filters.epic_id);
  }

  if (filters?.assigned_to_user_id) {
    conditions.push('t.assigned_to_user_id = ?');
    values.push(filters.assigned_to_user_id);
  }

  if (filters?.search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    values.push(searchTerm, searchTerm);
  }

  // Sorting configuration
  const sort = paginationOpts?.sort ?? 'created_at';
  const order = paginationOpts?.order ?? 'desc';
  const limit = Math.min(paginationOpts?.limit ?? 20, 100);

  // Cursor handling
  const cursor = paginationOpts?.cursor ? decodeCursor(paginationOpts.cursor) : null;

  if (cursor) {
    // For cursor pagination, add condition to get items after/before the cursor
    const op = order === 'desc' ? '<' : '>';
    conditions.push(`(t.${sort}, t.id) ${op} (?, ?)`);
    values.push(cursor.sortValue, cursor.id);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count (without cursor condition)
  const countConditions: string[] = ['t.project_id = ?'];
  const countValues: (string | number)[] = [projectId];

  if (filters?.status) {
    countConditions.push('t.status = ?');
    countValues.push(filters.status);
  }
  if (filters?.epic_id) {
    countConditions.push('t.epic_id = ?');
    countValues.push(filters.epic_id);
  }
  if (filters?.assigned_to_user_id) {
    countConditions.push('t.assigned_to_user_id = ?');
    countValues.push(filters.assigned_to_user_id);
  }
  if (filters?.search) {
    countConditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    countValues.push(searchTerm, searchTerm);
  }

  const countResult = db
    .prepare(`SELECT COUNT(*) as count FROM tasks t WHERE ${countConditions.join(' AND ')}`)
    .get(...countValues) as { count: number };

  // Fetch one extra record to determine if there are more
  const orderDir = order === 'desc' ? 'DESC' : 'ASC';
  const tasks = db
    .prepare(
      `
      SELECT t.*,
        (
          SELECT COUNT(*) FROM task_dependencies td
          INNER JOIN tasks blocker ON blocker.id = td.depends_on_task_id
          WHERE td.task_id = t.id AND blocker.status NOT IN ('approved', 'done')
        ) as blocked_by_count
      FROM tasks t
      WHERE ${whereClause}
      ORDER BY t.${sort} ${orderDir}, t.id ${orderDir}
      LIMIT ?
    `
    )
    .all(...values, limit + 1) as Task[];

  // Determine if there are more records
  const hasMore = tasks.length > limit;
  if (hasMore) {
    tasks.pop(); // Remove the extra record
  }

  // Generate cursors
  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  if (tasks.length > 0) {
    const lastTask = tasks[tasks.length - 1]!;
    const firstTask = tasks[0]!;

    // Next cursor (for pagination forward)
    if (hasMore) {
      const sortValue = lastTask[sort as keyof Task];
      nextCursor = encodeCursor(lastTask.id, sortValue as string | number);
    }

    // Previous cursor (if we used a cursor to get here)
    if (cursor) {
      const sortValue = firstTask[sort as keyof Task];
      prevCursor = encodeCursor(firstTask.id, sortValue as string | number);
    }
  }

  return {
    data: tasks,
    pagination: {
      next_cursor: nextCursor,
      prev_cursor: prevCursor,
      has_more: hasMore,
      total: countResult.count,
    },
  };
}

/**
 * Get task by ID
 */
export function getTaskById(id: number): Task | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT t.*,
        (
          SELECT COUNT(*) FROM task_dependencies td
          INNER JOIN tasks blocker ON blocker.id = td.depends_on_task_id
          WHERE td.task_id = t.id AND blocker.status NOT IN ('approved', 'done')
        ) as blocked_by_count
      FROM tasks t
      WHERE t.id = ?
    `
    )
    .get(id) as Task | undefined;
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
      (input.requires_approval ?? true) ? 1 : 0, // SQLite needs integer for boolean
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
    'github_pr_url',
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
