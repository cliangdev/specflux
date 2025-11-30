import { Router, Request, Response, NextFunction } from 'express';
import {
  listEpics,
  getEpicWithStats,
  createEpic,
  updateEpic,
  deleteEpic,
  getEpicTasks,
  getEpicProgress,
  getEpicById,
} from '../services/epic.service';
import { userHasProjectAccess } from '../services/project.service';
import {
  listCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  getCriterionById,
} from '../services/acceptance-criteria.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/epics - List all epics for a project
 */
router.get('/projects/:projectId/epics', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const epics = listEpics(projectId);
    res.json({ success: true, data: epics });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/epics - Create a new epic
 */
router.post('/projects/:projectId/epics', (req: Request, res: Response, next: NextFunction) => {
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
      prd_file_path,
      epic_file_path,
      status,
      release_id,
      depends_on,
      target_date,
      acceptance_criteria,
    } = body;

    if (!title || typeof title !== 'string') {
      throw new ValidationError('title is required');
    }

    // Validate acceptance_criteria is a non-empty array of strings
    if (!Array.isArray(acceptance_criteria) || acceptance_criteria.length === 0) {
      throw new ValidationError('acceptance_criteria is required - provide at least one criterion');
    }
    const criteriaList = acceptance_criteria.filter(
      (c): c is string => typeof c === 'string' && c.trim().length > 0
    );
    if (criteriaList.length === 0) {
      throw new ValidationError(
        'acceptance_criteria must contain at least one non-empty criterion'
      );
    }

    const epic = createEpic(
      projectId,
      {
        title,
        description: description as string | undefined,
        prd_file_path: prd_file_path as string | undefined,
        epic_file_path: epic_file_path as string | undefined,
        status: status as string | undefined,
        release_id: release_id as number | null | undefined,
        depends_on: depends_on as number[] | undefined,
        target_date: target_date as string | null | undefined,
      },
      req.userId!
    );

    // Create individual criterion records in the AcceptanceCriterion table
    for (const text of criteriaList) {
      createCriterion('epic', epic.id, { text: text.trim() });
    }

    res.status(201).json({ success: true, data: epic });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /epics/:id - Get epic details
 */
router.get('/epics/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const epic = getEpicWithStats(epicId);

    if (!epic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(epic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    // Add acceptance criteria to the response
    const acceptance_criteria = listCriteria('epic', epicId);

    res.json({ success: true, data: { ...epic, acceptance_criteria } });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /epics/:id - Update epic
 */
router.put('/epics/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const existingEpic = getEpicById(epicId);

    if (!existingEpic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(existingEpic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    const body = req.body as Record<string, unknown>;
    const {
      title,
      description,
      prd_file_path,
      epic_file_path,
      status,
      release_id,
      depends_on,
      target_date,
    } = body;

    const epic = updateEpic(epicId, {
      title: title as string | undefined,
      description: description as string | null | undefined,
      prd_file_path: prd_file_path as string | null | undefined,
      epic_file_path: epic_file_path as string | null | undefined,
      status: status as string | undefined,
      release_id: release_id as number | null | undefined,
      depends_on: depends_on as number[] | undefined,
      target_date: target_date as string | null | undefined,
    });

    res.json({ success: true, data: epic });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /epics/:id - Delete epic
 */
router.delete('/epics/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const existingEpic = getEpicById(epicId);

    if (!existingEpic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(existingEpic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    deleteEpic(epicId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /epics/:id/tasks - Get tasks in an epic
 */
router.get('/epics/:id/tasks', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const epic = getEpicById(epicId);

    if (!epic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(epic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    const tasks = getEpicTasks(epicId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /epics/:id/progress - Get epic progress stats
 */
router.get('/epics/:id/progress', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const epic = getEpicById(epicId);

    if (!epic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(epic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    const progress = getEpicProgress(epicId);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Acceptance Criteria Endpoints
// ============================================================================

/**
 * GET /epics/:id/criteria - List acceptance criteria for an epic
 */
router.get('/epics/:id/criteria', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const epic = getEpicById(epicId);
    if (!epic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(epic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    const criteria = listCriteria('epic', epicId);
    res.json({ success: true, data: criteria });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /epics/:id/criteria - Create acceptance criterion for an epic
 */
router.post('/epics/:id/criteria', (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicId = parseInt(req.params['id']!, 10);

    if (isNaN(epicId)) {
      throw new ValidationError('Invalid epic id');
    }

    const epic = getEpicById(epicId);
    if (!epic) {
      throw new NotFoundError('Epic', epicId);
    }

    if (!userHasProjectAccess(epic.project_id, req.userId!)) {
      throw new NotFoundError('Epic', epicId);
    }

    const body = req.body as Record<string, unknown>;
    const { text, position } = body;

    if (!text || typeof text !== 'string') {
      throw new ValidationError('text is required');
    }

    const criterion = createCriterion('epic', epicId, {
      text,
      position: position as number | undefined,
    });

    res.status(201).json({ success: true, data: criterion });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /epics/:id/criteria/:criterionId - Update acceptance criterion
 */
router.put(
  '/epics/:id/criteria/:criterionId',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const epicId = parseInt(req.params['id']!, 10);
      const criterionId = parseInt(req.params['criterionId']!, 10);

      if (isNaN(epicId) || isNaN(criterionId)) {
        throw new ValidationError('Invalid epic or criterion id');
      }

      const epic = getEpicById(epicId);
      if (!epic) {
        throw new NotFoundError('Epic', epicId);
      }

      if (!userHasProjectAccess(epic.project_id, req.userId!)) {
        throw new NotFoundError('Epic', epicId);
      }

      // Verify criterion belongs to this epic
      const existingCriterion = getCriterionById(criterionId);
      if (existingCriterion?.entity_type !== 'epic' || existingCriterion.entity_id !== epicId) {
        throw new NotFoundError('AcceptanceCriterion', criterionId);
      }

      const body = req.body as Record<string, unknown>;
      const criterion = updateCriterion(criterionId, {
        text: body['text'] as string | undefined,
        checked: body['checked'] as boolean | undefined,
        position: body['position'] as number | undefined,
      });

      res.json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /epics/:id/criteria/:criterionId - Delete acceptance criterion
 */
router.delete(
  '/epics/:id/criteria/:criterionId',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const epicId = parseInt(req.params['id']!, 10);
      const criterionId = parseInt(req.params['criterionId']!, 10);

      if (isNaN(epicId) || isNaN(criterionId)) {
        throw new ValidationError('Invalid epic or criterion id');
      }

      const epic = getEpicById(epicId);
      if (!epic) {
        throw new NotFoundError('Epic', epicId);
      }

      if (!userHasProjectAccess(epic.project_id, req.userId!)) {
        throw new NotFoundError('Epic', epicId);
      }

      // Verify criterion belongs to this epic
      const existingCriterion = getCriterionById(criterionId);
      if (existingCriterion?.entity_type !== 'epic' || existingCriterion.entity_id !== epicId) {
        throw new NotFoundError('AcceptanceCriterion', criterionId);
      }

      deleteCriterion(criterionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
