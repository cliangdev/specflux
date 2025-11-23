import { Router, Request, Response, NextFunction } from 'express';
import {
  spawnAgent,
  stopAgent,
  getAgentStatus,
  getTaskSessionHistory,
  listRunningAgents,
} from '../services/agent.service';
import { getTaskById } from '../services/task.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /api/tasks/:id/agent/status
 * Get agent status for a task
 */
router.get('/tasks/:id/agent/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id'] ?? '0', 10);

    // Verify task exists
    const task = getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const status = getAgentStatus(taskId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tasks/:id/agent/start
 * Start agent for a task
 */
router.post('/tasks/:id/agent/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id'] ?? '0', 10);
    const { command, args, env } = req.body as {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    };

    // Verify task exists
    const task = getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const session = spawnAgent(taskId, { command, args, env });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('already running')) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/tasks/:id/agent/stop
 * Stop agent for a task
 */
router.post('/tasks/:id/agent/stop', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id'] ?? '0', 10);

    // Verify task exists
    const task = getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    stopAgent(taskId);

    res.json({
      success: true,
      data: { message: 'Agent stop signal sent' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/:id/agent/history
 * Get agent session history for a task
 */
router.get('/tasks/:id/agent/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = parseInt(req.params['id'] ?? '0', 10);

    // Verify task exists
    const task = getTaskById(taskId);
    if (!task) {
      throw new NotFoundError('Task', taskId);
    }

    const history = getTaskSessionHistory(taskId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agents
 * List all running agents
 */
router.get('/agents', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = listRunningAgents();

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
