import { Router, Request, Response, NextFunction } from 'express';
import {
  listRepositories,
  getRepositoryById,
  createRepository,
  updateRepository,
  deleteRepository,
  syncRepository,
} from '../services/repository.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/repositories - List repositories for a project
 */
router.get(
  '/projects/:projectId/repositories',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const repositories = listRepositories(projectId);
      res.json({ success: true, data: repositories });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/repositories - Add a repository
 */
router.post(
  '/projects/:projectId/repositories',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const body = req.body as Record<string, unknown>;
      const { name, path, git_url, default_agent } = body;

      if (!name || typeof name !== 'string') {
        throw new ValidationError('name is required');
      }

      if (!path || typeof path !== 'string') {
        throw new ValidationError('path is required');
      }

      const repository = createRepository(projectId, {
        name,
        path,
        git_url: git_url as string | undefined,
        default_agent: default_agent as string | undefined,
      });

      res.status(201).json({ success: true, data: repository });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /repositories/:id - Get repository details
 */
router.get('/repositories/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = parseInt(req.params['id']!, 10);

    if (isNaN(repoId)) {
      throw new ValidationError('Invalid repository id');
    }

    const repository = getRepositoryById(repoId);

    if (!repository) {
      throw new NotFoundError('Repository', repoId);
    }

    if (!userHasProjectAccess(repository.project_id, req.userId!)) {
      throw new NotFoundError('Repository', repoId);
    }

    res.json({ success: true, data: repository });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /repositories/:id - Update repository
 */
router.put('/repositories/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = parseInt(req.params['id']!, 10);

    if (isNaN(repoId)) {
      throw new ValidationError('Invalid repository id');
    }

    const existingRepo = getRepositoryById(repoId);

    if (!existingRepo) {
      throw new NotFoundError('Repository', repoId);
    }

    if (!userHasProjectAccess(existingRepo.project_id, req.userId!)) {
      throw new NotFoundError('Repository', repoId);
    }

    const body = req.body as Record<string, unknown>;
    const { name, path, git_url, default_agent, status } = body;

    const repository = updateRepository(repoId, {
      name: name as string | undefined,
      path: path as string | undefined,
      git_url: git_url as string | null | undefined,
      default_agent: default_agent as string | null | undefined,
      status: status as string | undefined,
    });

    res.json({ success: true, data: repository });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /repositories/:id - Remove repository
 */
router.delete('/repositories/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = parseInt(req.params['id']!, 10);

    if (isNaN(repoId)) {
      throw new ValidationError('Invalid repository id');
    }

    const existingRepo = getRepositoryById(repoId);

    if (!existingRepo) {
      throw new NotFoundError('Repository', repoId);
    }

    if (!userHasProjectAccess(existingRepo.project_id, req.userId!)) {
      throw new NotFoundError('Repository', repoId);
    }

    deleteRepository(repoId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /repositories/:id/sync - Sync repository with remote
 */
router.post('/repositories/:id/sync', (req: Request, res: Response, next: NextFunction) => {
  try {
    const repoId = parseInt(req.params['id']!, 10);

    if (isNaN(repoId)) {
      throw new ValidationError('Invalid repository id');
    }

    const existingRepo = getRepositoryById(repoId);

    if (!existingRepo) {
      throw new NotFoundError('Repository', repoId);
    }

    if (!userHasProjectAccess(existingRepo.project_id, req.userId!)) {
      throw new NotFoundError('Repository', repoId);
    }

    const repository = syncRepository(repoId);
    res.json({ success: true, data: repository });
  } catch (error) {
    next(error);
  }
});

export default router;
