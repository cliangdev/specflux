/**
 * Skill Routes
 * RESTful CRUD endpoints for skill definitions
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  listSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  syncSkillsFromFilesystem,
  CreateSkillInput,
  UpdateSkillInput,
} from '../services/skill.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/skills
 * List all skills for a project
 */
router.get('/projects/:projectId/skills', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const skills = listSkills(projectId);

    // Parse JSON fields
    const enrichedSkills = skills.map((skill) => ({
      ...skill,
      file_patterns: skill.file_patterns ? (JSON.parse(skill.file_patterns) as string[]) : null,
    }));

    res.json({ success: true, data: enrichedSkills });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/skills
 * Create a new skill
 */
router.post('/projects/:projectId/skills', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as CreateSkillInput;

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new ValidationError('name is required');
    }

    if (
      !body.folder_path ||
      typeof body.folder_path !== 'string' ||
      body.folder_path.trim() === ''
    ) {
      throw new ValidationError('folder_path is required');
    }

    const skill = createSkill(projectId, {
      name: body.name.trim(),
      folder_path: body.folder_path.trim(),
      description: body.description,
      file_patterns: body.file_patterns,
    });

    res.status(201).json({
      success: true,
      data: {
        ...skill,
        file_patterns: skill.file_patterns ? (JSON.parse(skill.file_patterns) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/skills/sync
 * Sync skills from filesystem (.claude/skills/ directory)
 */
router.post(
  '/projects/:projectId/skills/sync',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const result = syncSkillsFromFilesystem(projectId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /skills/:id
 * Get a single skill by ID
 */
router.get('/skills/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = parseInt(req.params['id']!, 10);

    if (isNaN(skillId)) {
      throw new ValidationError('Invalid skill id');
    }

    const skill = getSkillById(skillId);
    if (!skill) {
      throw new NotFoundError('Skill', skillId);
    }

    // Check project access
    if (!userHasProjectAccess(skill.project_id, req.userId!)) {
      throw new NotFoundError('Skill', skillId);
    }

    res.json({
      success: true,
      data: {
        ...skill,
        file_patterns: skill.file_patterns ? (JSON.parse(skill.file_patterns) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /skills/:id
 * Update a skill (full replacement)
 */
router.put('/skills/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = parseInt(req.params['id']!, 10);

    if (isNaN(skillId)) {
      throw new ValidationError('Invalid skill id');
    }

    const existing = getSkillById(skillId);
    if (!existing) {
      throw new NotFoundError('Skill', skillId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Skill', skillId);
    }

    const body = req.body as UpdateSkillInput;

    const skill = updateSkill(skillId, {
      name: body.name,
      folder_path: body.folder_path,
      description: body.description,
      file_patterns: body.file_patterns,
    });

    res.json({
      success: true,
      data: {
        ...skill,
        file_patterns: skill.file_patterns ? (JSON.parse(skill.file_patterns) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /skills/:id
 * Partially update a skill
 */
router.patch('/skills/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = parseInt(req.params['id']!, 10);

    if (isNaN(skillId)) {
      throw new ValidationError('Invalid skill id');
    }

    const existing = getSkillById(skillId);
    if (!existing) {
      throw new NotFoundError('Skill', skillId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Skill', skillId);
    }

    const body = req.body as Partial<UpdateSkillInput>;

    const skill = updateSkill(skillId, body);

    res.json({
      success: true,
      data: {
        ...skill,
        file_patterns: skill.file_patterns ? (JSON.parse(skill.file_patterns) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /skills/:id
 * Delete a skill
 */
router.delete('/skills/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const skillId = parseInt(req.params['id']!, 10);

    if (isNaN(skillId)) {
      throw new ValidationError('Invalid skill id');
    }

    const existing = getSkillById(skillId);
    if (!existing) {
      throw new NotFoundError('Skill', skillId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Skill', skillId);
    }

    deleteSkill(skillId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
