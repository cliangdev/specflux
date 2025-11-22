import { Router, Request, Response, NextFunction } from 'express';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectConfig,
  updateProjectConfig,
  getProjectDashboard,
  getProjectStats,
  userHasProjectAccess,
} from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects - List all projects for current user
 */
router.get('/', (req: Request, res: Response) => {
  const projects = listProjects(req.userId!);
  res.json({ success: true, data: projects });
});

/**
 * POST /projects - Create a new project
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { name, local_path, git_remote, workflow_template } = body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('name is required');
    }

    if (!local_path || typeof local_path !== 'string') {
      throw new ValidationError('local_path is required');
    }

    const project = createProject(
      {
        name,
        local_path,
        git_remote: git_remote as string | undefined,
        workflow_template: workflow_template as string | undefined,
      },
      req.userId!
    );

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id - Get project details
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const project = getProjectById(projectId);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /projects/:id - Update project
 */
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as Record<string, unknown>;
    const { name, local_path, git_remote, workflow_template } = body;

    const project = updateProject(projectId, {
      name: name as string | undefined,
      local_path: local_path as string | undefined,
      git_remote: git_remote as string | null | undefined,
      workflow_template: workflow_template as string | undefined,
    });

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /projects/:id - Delete project
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    deleteProject(projectId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/config - Get project configuration
 */
router.get('/:id/config', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const config = getProjectConfig(projectId);

    if (!config) {
      throw new NotFoundError('ProjectConfig', projectId);
    }

    // Parse JSON fields for response
    const responseConfig = {
      ...config,
      workflow_config: config.workflow_config
        ? (JSON.parse(config.workflow_config) as object)
        : null,
      approval_config: config.approval_config
        ? (JSON.parse(config.approval_config) as object)
        : null,
    };

    res.json({ success: true, data: responseConfig });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /projects/:id/config - Update project configuration
 */
router.put('/:id/config', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as Record<string, unknown>;
    const { workflow_template, workflow_config, approval_config } = body;

    const config = updateProjectConfig(projectId, {
      workflow_template: workflow_template as string | undefined,
      workflow_config: workflow_config as object | undefined,
      approval_config: approval_config as object | undefined,
    });

    // Parse JSON fields for response
    const responseConfig = {
      ...config,
      workflow_config: config.workflow_config
        ? (JSON.parse(config.workflow_config) as object)
        : null,
      approval_config: config.approval_config
        ? (JSON.parse(config.approval_config) as object)
        : null,
    };

    res.json({ success: true, data: responseConfig });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/dashboard - Get project dashboard data
 */
router.get('/:id/dashboard', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const dashboard = getProjectDashboard(projectId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /projects/:id/stats - Get project statistics
 */
router.get('/:id/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['id']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const stats = getProjectStats(projectId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
