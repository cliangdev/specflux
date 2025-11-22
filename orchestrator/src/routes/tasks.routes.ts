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
} from '../services/task.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/tasks - List tasks for a project
 */
router.get('/projects/:projectId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const { status, epic_id, assigned_to_user_id, search, page, limit } = req.query;

    const filters = {
      status: status as string | undefined,
      epic_id: epic_id ? parseInt(epic_id as string, 10) : undefined,
      assigned_to_user_id: assigned_to_user_id
        ? parseInt(assigned_to_user_id as string, 10)
        : undefined,
      search: search as string | undefined,
    };

    const pagination = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    };

    const { tasks, total } = listTasks(projectId, filters, pagination);

    res.json({
      success: true,
      data: {
        items: tasks,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/tasks - Create a new task
 */
router.post('/projects/:projectId/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
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
      req.userId!
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

    if (!userHasProjectAccess(task.project_id, req.userId!)) {
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

    if (!userHasProjectAccess(existingTask.project_id, req.userId!)) {
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

    if (!userHasProjectAccess(existingTask.project_id, req.userId!)) {
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

// Agent-related endpoints (stubs for now - will be fully implemented in Week 3)

/**
 * GET /tasks/:id/agent - Get agent status (stub)
 */
router.get('/tasks/:id/agent', (req: Request, res: Response, next: NextFunction) => {
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
        task_id: taskId,
        status: 'idle',
        pid: null,
        started_at: null,
        stopped_at: null,
        error_message: null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /tasks/:id/agent - Control agent (stub)
 */
router.put('/tasks/:id/agent', (req: Request, res: Response, next: NextFunction) => {
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
    const action = body['action'] as string | undefined;

    if (!action || !['start', 'pause', 'resume', 'stop'].includes(action)) {
      throw new ValidationError('action must be "start", "pause", "resume", or "stop"');
    }

    // Stub response - will be implemented in Week 3
    res.json({
      success: true,
      data: {
        task_id: taskId,
        status: action === 'start' ? 'running' : 'idle',
        pid: null,
        started_at: action === 'start' ? new Date().toISOString() : null,
        stopped_at: null,
        error_message: null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /tasks/:id/agent/output - Get agent terminal output (stub)
 */
router.get('/tasks/:id/agent/output', (req: Request, res: Response, next: NextFunction) => {
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
        output: '',
        lines: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

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
 * GET /tasks/:id/diff - Get code diff (stub)
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

    // Stub response
    res.json({
      success: true,
      data: {
        diff: '',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
