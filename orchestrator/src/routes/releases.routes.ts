import { Router, Request, Response, NextFunction } from 'express';
import {
  listReleases,
  getReleaseWithStats,
  createRelease,
  updateRelease,
  deleteRelease,
  getReleaseRoadmap,
  getReleaseById,
} from '../services/release.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/releases - List all releases for a project
 */
router.get('/projects/:projectId/releases', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const status = req.query['status'] as string | undefined;
    const releases = listReleases(projectId, status);
    res.json({ success: true, data: releases });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/releases - Create a new release
 */
router.post('/projects/:projectId/releases', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as Record<string, unknown>;
    const { name, target_date, description } = body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('name is required');
    }

    const release = createRelease(projectId, {
      name,
      target_date: target_date as string | undefined,
      description: description as string | undefined,
    });

    res.status(201).json({ success: true, data: release });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /releases/:id - Get release details
 */
router.get('/releases/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const releaseId = parseInt(req.params['id']!, 10);

    if (isNaN(releaseId)) {
      throw new ValidationError('Invalid release id');
    }

    const release = getReleaseWithStats(releaseId);

    if (!release) {
      throw new NotFoundError('Release', releaseId);
    }

    if (!userHasProjectAccess(release.project_id, req.userId!)) {
      throw new NotFoundError('Release', releaseId);
    }

    res.json({ success: true, data: release });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /releases/:id - Update release
 */
router.put('/releases/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const releaseId = parseInt(req.params['id']!, 10);

    if (isNaN(releaseId)) {
      throw new ValidationError('Invalid release id');
    }

    const existingRelease = getReleaseById(releaseId);

    if (!existingRelease) {
      throw new NotFoundError('Release', releaseId);
    }

    if (!userHasProjectAccess(existingRelease.project_id, req.userId!)) {
      throw new NotFoundError('Release', releaseId);
    }

    const body = req.body as Record<string, unknown>;
    const { name, target_date, status, description } = body;

    const release = updateRelease(releaseId, {
      name: name as string | undefined,
      target_date: target_date as string | null | undefined,
      status: status as string | undefined,
      description: description as string | null | undefined,
    });

    res.json({ success: true, data: release });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /releases/:id - Delete release
 */
router.delete('/releases/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const releaseId = parseInt(req.params['id']!, 10);

    if (isNaN(releaseId)) {
      throw new ValidationError('Invalid release id');
    }

    const existingRelease = getReleaseById(releaseId);

    if (!existingRelease) {
      throw new NotFoundError('Release', releaseId);
    }

    if (!userHasProjectAccess(existingRelease.project_id, req.userId!)) {
      throw new NotFoundError('Release', releaseId);
    }

    deleteRelease(releaseId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /releases/:id/roadmap - Get release roadmap with phase-grouped epics
 */
router.get('/releases/:id/roadmap', (req: Request, res: Response, next: NextFunction) => {
  try {
    const releaseId = parseInt(req.params['id']!, 10);

    if (isNaN(releaseId)) {
      throw new ValidationError('Invalid release id');
    }

    const roadmap = getReleaseRoadmap(releaseId);

    if (!roadmap) {
      throw new NotFoundError('Release', releaseId);
    }

    if (!userHasProjectAccess(roadmap.release.project_id, req.userId!)) {
      throw new NotFoundError('Release', releaseId);
    }

    res.json({ success: true, data: roadmap });
  } catch (error) {
    next(error);
  }
});

export default router;
