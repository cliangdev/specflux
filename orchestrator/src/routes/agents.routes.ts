/**
 * Agent Configuration Routes
 * RESTful CRUD endpoints for agent definitions
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  listAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  setProjectDefaultAgent,
  countTasksWithAgent,
  syncAgentsFromFilesystem,
  CreateAgentInput,
  UpdateAgentInput,
} from '../services/agent-config.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/agents
 * List all agents for a project
 */
router.get('/projects/:projectId/agents', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const agents = listAgents(projectId);

    // Enrich with task counts
    const enrichedAgents = agents.map((agent) => ({
      ...agent,
      tools: agent.tools ? (JSON.parse(agent.tools) as string[]) : null,
      task_count: countTasksWithAgent(agent.id),
    }));

    res.json({ success: true, data: enrichedAgents });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/agents
 * Create a new agent
 */
router.post('/projects/:projectId/agents', (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = parseInt(req.params['projectId']!, 10);

    if (isNaN(projectId)) {
      throw new ValidationError('Invalid project id');
    }

    if (!userHasProjectAccess(projectId, req.userId!)) {
      throw new NotFoundError('Project', projectId);
    }

    const body = req.body as CreateAgentInput;

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new ValidationError('name is required');
    }

    const agent = createAgent(projectId, {
      name: body.name.trim(),
      description: body.description,
      emoji: body.emoji,
      system_prompt: body.system_prompt,
      tools: body.tools,
      config_file_path: body.config_file_path,
    });

    res.status(201).json({
      success: true,
      data: {
        ...agent,
        tools: agent.tools ? (JSON.parse(agent.tools) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/:projectId/agents/sync
 * Sync agents from filesystem (.claude/agents/ directory)
 */
router.post(
  '/projects/:projectId/agents/sync',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const result = syncAgentsFromFilesystem(projectId);

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
 * GET /agents/:id
 * Get a single agent by ID
 */
router.get('/agents/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = parseInt(req.params['id']!, 10);

    if (isNaN(agentId)) {
      throw new ValidationError('Invalid agent id');
    }

    const agent = getAgentById(agentId);
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }

    // Check project access
    if (!userHasProjectAccess(agent.project_id, req.userId!)) {
      throw new NotFoundError('Agent', agentId);
    }

    res.json({
      success: true,
      data: {
        ...agent,
        tools: agent.tools ? (JSON.parse(agent.tools) as string[]) : null,
        task_count: countTasksWithAgent(agent.id),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /agents/:id
 * Update an agent (full replacement)
 */
router.put('/agents/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = parseInt(req.params['id']!, 10);

    if (isNaN(agentId)) {
      throw new ValidationError('Invalid agent id');
    }

    const existing = getAgentById(agentId);
    if (!existing) {
      throw new NotFoundError('Agent', agentId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Agent', agentId);
    }

    const body = req.body as UpdateAgentInput;

    const agent = updateAgent(agentId, {
      name: body.name,
      description: body.description,
      emoji: body.emoji,
      system_prompt: body.system_prompt,
      tools: body.tools,
      config_file_path: body.config_file_path,
    });

    res.json({
      success: true,
      data: {
        ...agent,
        tools: agent.tools ? (JSON.parse(agent.tools) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /agents/:id
 * Partially update an agent
 */
router.patch('/agents/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = parseInt(req.params['id']!, 10);

    if (isNaN(agentId)) {
      throw new ValidationError('Invalid agent id');
    }

    const existing = getAgentById(agentId);
    if (!existing) {
      throw new NotFoundError('Agent', agentId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Agent', agentId);
    }

    const body = req.body as Partial<UpdateAgentInput>;

    const agent = updateAgent(agentId, body);

    res.json({
      success: true,
      data: {
        ...agent,
        tools: agent.tools ? (JSON.parse(agent.tools) as string[]) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /agents/:id
 * Delete an agent
 */
router.delete('/agents/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = parseInt(req.params['id']!, 10);

    if (isNaN(agentId)) {
      throw new ValidationError('Invalid agent id');
    }

    const existing = getAgentById(agentId);
    if (!existing) {
      throw new NotFoundError('Agent', agentId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('Agent', agentId);
    }

    deleteAgent(agentId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /projects/:projectId/default-agent
 * Set the default agent for a project
 */
router.put(
  '/projects/:projectId/default-agent',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const { agent_id } = req.body as { agent_id: number | null };

      setProjectDefaultAgent(projectId, agent_id);

      res.json({
        success: true,
        data: { project_id: projectId, default_agent_id: agent_id },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
