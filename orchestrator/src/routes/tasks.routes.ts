import { Router, Request, Response, NextFunction } from 'express';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
  submitTaskReview,
  isTaskBlocked,
  TaskSortField,
  SortOrder,
} from '../services/task.service';
import {
  userHasProjectAccess,
  getProjectConfig,
  getProjectById,
} from '../services/project.service';
import { getWorktree } from '../services/worktree.service';
import { getWorktreeChanges, getWorktreeDiff } from '../services/git-workflow.service';
import { createTaskPR, approveTask } from '../services/agent.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

// Valid sort fields for tasks
const VALID_SORT_FIELDS: TaskSortField[] = [
  'created_at',
  'updated_at',
  'title',
  'status',
  'progress_percentage',
];

/**
 * GET /projects/:projectId/tasks - List tasks for a project
 * Supports cursor-based pagination with sorting
 * Uses default user ID 1 if no auth header (development mode)
 */
router.get('/projects/:projectId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    // Use default user ID 1 for development when no auth
    const userId = req.userId ?? 1;
    if (!userHasProjectAccess(projectId, userId)) {
      throw new NotFoundError('Project', projectId);
    }

    const { status, epic_id, assigned_to_user_id, search, sort, order, cursor, limit } = req.query;

    // Validate sort field
    const sortField = (sort as string) || 'created_at';
    if (!VALID_SORT_FIELDS.includes(sortField as TaskSortField)) {
      throw new ValidationError(
        `Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(', ')}`
      );
    }

    // Validate sort order
    const sortOrder = (order as string) || 'desc';
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new ValidationError('Invalid sort order. Must be asc or desc');
    }

    const filters = {
      status: status as string | undefined,
      epic_id: epic_id ? parseInt(epic_id as string, 10) : undefined,
      assigned_to_user_id: assigned_to_user_id
        ? parseInt(assigned_to_user_id as string, 10)
        : undefined,
      search: search as string | undefined,
    };

    const paginationOpts = {
      sort: sortField as TaskSortField,
      order: sortOrder as SortOrder,
      cursor: cursor as string | undefined,
      limit: limit ? Math.min(parseInt(limit as string, 10), 100) : 20,
    };

    const result = listTasks(projectId, filters, paginationOpts);

    // Response format matches OpenAPI spec with CursorPagination
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/tasks - Create a new task
 * Uses default user ID 1 if no auth header (development mode)
 */
router.post('/projects/:projectId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    // Use default user ID 1 for development when no auth
    const userId = req.userId ?? 1;
    if (!userHasProjectAccess(projectId, userId)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as Record<string, unknown>;
    const {
      title,
      description,
      epic_id,
      requires_approval,
      repo_name,
      agent_name,
      estimated_duration,
    } = body;

    if (!title || typeof title !== 'string') {
      throw new ValidationError('title is required');
    }

    const task = createTask(
      projectId,
      {
        title,
        description: description as string | undefined,
        epic_id: epic_id as number | undefined,
        requires_approval: requires_approval as boolean | undefined,
        repo_name: repo_name as string | undefined,
        agent_name: agent_name as string | undefined,
        estimated_duration: estimated_duration as number | undefined,
      },
      userId
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id - Get task details
 */
router.get('/tasks/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    // Use default user ID 1 for development when no auth
    const userId = req.userId ?? 1;
    if (!userHasProjectAccess(task.project_id, userId)) {
      throw new NotFoundError('Task', taskId);
    }

    // Add blocked status
    const blocked = isTaskBlocked(taskId);

    res.json({ success: true, data: { ...task, is_blocked: blocked } });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /tasks/:id - Update task
 */
router.patch('/tasks/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const existingTask = getTaskById(taskId);

    if (!existingTask) {
      throw new NotFoundError('Task', taskId);
    }

    // Use default user ID 1 for development when no auth
    const userId = req.userId ?? 1;
    if (!userHasProjectAccess(existingTask.project_id, userId)) {
      throw new NotFoundError('Task', taskId);
    }

    const task = updateTask(taskId, req.body as Record<string, unknown>);

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tasks/:id - Delete task
 */
router.delete('/tasks/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const existingTask = getTaskById(taskId);

    if (!existingTask) {
      throw new NotFoundError('Task', taskId);
    }

    // Use default user ID 1 for development when no auth
    const userId = req.userId ?? 1;
    if (!userHasProjectAccess(existingTask.project_id, userId)) {
      throw new NotFoundError('Task', taskId);
    }

    deleteTask(taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /tasks/:id/assignee - Assign/unassign task
 */
router.put('/tasks/:id/assignee', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const existingTask = getTaskById(taskId);

    if (!existingTask) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(existingTask.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    const body = req.body as Record<string, unknown>;
    const userId = body['user_id'] as number | null | undefined;
    const task = assignTask(taskId, userId ?? null);

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id/dependencies - Get task dependencies
 */
router.get('/tasks/:id/dependencies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    const dependencies = getTaskDependencies(taskId);

    res.json({ success: true, data: dependencies });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/dependencies - Add task dependency
 */
router.post('/tasks/:id/dependencies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    const body = req.body as Record<string, unknown>;
    const depends_on_task_id = body['depends_on_task_id'];

    if (!depends_on_task_id || typeof depends_on_task_id !== 'number') {
      throw new ValidationError('depends_on_task_id is required');
    }

    const dependency = addTaskDependency(taskId, depends_on_task_id);

    res.status(201).json({ success: true, data: dependency });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /tasks/:id/dependencies/:depId - Remove task dependency
 */
router.delete(
  '/tasks/:id/dependencies/:depId',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params['id']!, 10);
      const depId = parseInt(req.params['depId']!, 10);

      if (isNaN(taskId) || isNaN(depId)) {
        throw new ValidationError('Invalid task or dependency id');
      }

      const task = getTaskById(taskId);

      if (!task) {
        throw new NotFoundError('Task', taskId);
      }

      if (!userHasProjectAccess(task.project_id, req.userId!)) {
        throw new NotFoundError('Task', taskId);
      }

      removeTaskDependency(taskId, depId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /tasks/:id/review - Submit task review
 */
router.post('/tasks/:id/review', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const existingTask = getTaskById(taskId);

    if (!existingTask) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(existingTask.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    const body = req.body as Record<string, unknown>;
    const decision = body['decision'] as string | undefined;
    const feedback = body['feedback'] as string | undefined;

    if (!decision || !['approve', 'request_changes'].includes(decision)) {
      throw new ValidationError('decision must be "approve" or "request_changes"');
    }

    const task = submitTaskReview(
      taskId,
      req.userId!,
      decision as 'approve' | 'request_changes',
      feedback
    );

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

// Agent-related endpoints are now in agent.routes.ts

/**
 * GET /tasks/:id/changes - Get changed files (stub)
 */
router.get('/tasks/:id/changes', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    // Stub response
    res.json({
      success: true,
      data: {
        files: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id/diff - Get code diff for task worktree
 */
router.get('/tasks/:id/diff', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    // Get project to find worktree path
    const project = getProjectById(task.project_id);
    if (!project?.local_path) {
      res.json({
        success: true,
        data: {
          hasChanges: false,
          filesChanged: [],
          diff: '',
        },
      });
      return;
    }

    // Get worktree for this task
    const worktree = getWorktree(taskId, project.local_path);
    if (!worktree) {
      res.json({
        success: true,
        data: {
          hasChanges: false,
          filesChanged: [],
          diff: '',
        },
      });
      return;
    }

    // Get base branch from project config
    const config = getProjectConfig(task.project_id);
    const baseBranch = config?.default_pr_target_branch ?? 'main';

    // Get changes and diff compared to base branch
    const changes = getWorktreeChanges(worktree.path, baseBranch);
    let diff = '';
    if (changes.hasChanges) {
      diff = getWorktreeDiff(worktree.path, baseBranch);
    }

    res.json({
      success: true,
      data: {
        hasChanges: changes.hasChanges,
        filesChanged: changes.filesChanged,
        insertions: changes.insertions,
        deletions: changes.deletions,
        diff,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/create-pr - Create PR for task
 */
router.post('/tasks/:id/create-pr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    // Create PR
    const result = await createTaskPR(taskId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /tasks/:id/approve - Approve task and mark as done
 */
router.post('/tasks/:id/approve', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    // Only allow approval of pending_review tasks
    if (task.status !== 'pending_review') {
      throw new ValidationError('Task must be in pending_review status to approve');
    }

    // Approve task
    const result = approveTask(taskId);

    res.json({
      success: true,
      data: result.task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id/file-changes - Get file changes for a task from git status
 * Returns all uncommitted file changes in the task's worktree
 */
router.get('/tasks/:id/file-changes', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id']!, 10);

    if (isNaN(taskId)) {
      throw new ValidationError('Invalid task id');
    }

    const task = getTaskById(taskId);

    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
      throw new NotFoundError('Task', taskId);
    }

    // Get project to find worktree path
    const project = getProjectById(task.project_id);
    if (!project?.local_path) {
      res.json({
        success: true,
        data: {
          changes: [],
          summary: { total: 0, created: 0, modified: 0, deleted: 0 },
        },
      });
      return;
    }

    // Get the worktree for this task
    const worktree = getWorktree(taskId, project.local_path);

    if (!worktree) {
      // No worktree means no file changes
      res.json({
        success: true,
        data: {
          changes: [],
          summary: { total: 0, created: 0, modified: 0, deleted: 0 },
        },
      });
      return;
    }

    // Get base branch from project config for comparison
    const config = getProjectConfig(task.project_id);
    const baseBranch = config?.default_pr_target_branch ?? 'main';

    // Get file changes compared to base branch
    const changes = getWorktreeChanges(worktree.path, baseBranch);

    // Convert to the expected format
    const fileChanges = [
      ...changes.newFiles.map((f) => ({
        id: 0, // Not stored in DB
        taskId,
        sessionId: null,
        filePath: f,
        changeType: 'created' as const,
        diffSummary: null,
        createdAt: new Date().toISOString(),
      })),
      ...changes.modifiedFiles.map((f) => ({
        id: 0,
        taskId,
        sessionId: null,
        filePath: f,
        changeType: 'modified' as const,
        diffSummary: null,
        createdAt: new Date().toISOString(),
      })),
      ...changes.deletedFiles.map((f) => ({
        id: 0,
        taskId,
        sessionId: null,
        filePath: f,
        changeType: 'deleted' as const,
        diffSummary: null,
        createdAt: new Date().toISOString(),
      })),
    ];

    const summary = {
      total: fileChanges.length,
      created: changes.newFiles.length,
      modified: changes.modifiedFiles.length,
      deleted: changes.deletedFiles.length,
    };

    res.json({
      success: true,
      data: {
        changes: fileChanges,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
