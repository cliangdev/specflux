/**
 * MCP Server Routes
 * RESTful CRUD endpoints for MCP server configurations
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  listMcpServers,
  getMcpServerById,
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  toggleMcpServer,
  CreateMcpServerInput,
  UpdateMcpServerInput,
} from '../services/mcp-server.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/mcp-servers
 * List all MCP servers for a project
 */
router.get(
  '/projects/:projectId/mcp-servers',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const servers = listMcpServers(projectId);

      // Parse JSON fields and convert is_active to boolean
      const enrichedServers = servers.map((server) => ({
        ...server,
        args: JSON.parse(server.args) as string[],
        env_vars: server.env_vars ? (JSON.parse(server.env_vars) as Record<string, string>) : null,
        is_active: Boolean(server.is_active),
      }));

      res.json({ success: true, data: enrichedServers });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /projects/:projectId/mcp-servers
 * Create a new MCP server
 */
router.post(
  '/projects/:projectId/mcp-servers',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const body = req.body as CreateMcpServerInput;

      if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
        throw new ValidationError('name is required');
      }

      if (!body.command || typeof body.command !== 'string' || body.command.trim() === '') {
        throw new ValidationError('command is required');
      }

      if (!Array.isArray(body.args)) {
        throw new ValidationError('args must be an array');
      }

      const server = createMcpServer(projectId, {
        name: body.name.trim(),
        command: body.command.trim(),
        args: body.args,
        env_vars: body.env_vars,
        is_active: body.is_active,
      });

      res.status(201).json({
        success: true,
        data: {
          ...server,
          args: JSON.parse(server.args) as string[],
          env_vars: server.env_vars
            ? (JSON.parse(server.env_vars) as Record<string, string>)
            : null,
          is_active: Boolean(server.is_active),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /mcp-servers/:id
 * Get a single MCP server by ID
 */
router.get('/mcp-servers/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const serverId = parseInt(req.params['id']!, 10);

    if (isNaN(serverId)) {
      throw new ValidationError('Invalid MCP server id');
    }

    const server = getMcpServerById(serverId);
    if (!server) {
      throw new NotFoundError('MCP Server', serverId);
    }

    // Check project access
    if (!userHasProjectAccess(server.project_id, req.userId!)) {
      throw new NotFoundError('MCP Server', serverId);
    }

    res.json({
      success: true,
      data: {
        ...server,
        args: JSON.parse(server.args) as string[],
        env_vars: server.env_vars ? (JSON.parse(server.env_vars) as Record<string, string>) : null,
        is_active: Boolean(server.is_active),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /mcp-servers/:id
 * Update an MCP server (full replacement)
 */
router.put('/mcp-servers/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const serverId = parseInt(req.params['id']!, 10);

    if (isNaN(serverId)) {
      throw new ValidationError('Invalid MCP server id');
    }

    const existing = getMcpServerById(serverId);
    if (!existing) {
      throw new NotFoundError('MCP Server', serverId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('MCP Server', serverId);
    }

    const body = req.body as UpdateMcpServerInput;

    const server = updateMcpServer(serverId, {
      name: body.name,
      command: body.command,
      args: body.args,
      env_vars: body.env_vars,
      is_active: body.is_active,
    });

    res.json({
      success: true,
      data: {
        ...server,
        args: JSON.parse(server.args) as string[],
        env_vars: server.env_vars ? (JSON.parse(server.env_vars) as Record<string, string>) : null,
        is_active: Boolean(server.is_active),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /mcp-servers/:id
 * Partially update an MCP server
 */
router.patch('/mcp-servers/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const serverId = parseInt(req.params['id']!, 10);

    if (isNaN(serverId)) {
      throw new ValidationError('Invalid MCP server id');
    }

    const existing = getMcpServerById(serverId);
    if (!existing) {
      throw new NotFoundError('MCP Server', serverId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('MCP Server', serverId);
    }

    const body = req.body as Partial<UpdateMcpServerInput>;

    const server = updateMcpServer(serverId, body);

    res.json({
      success: true,
      data: {
        ...server,
        args: JSON.parse(server.args) as string[],
        env_vars: server.env_vars ? (JSON.parse(server.env_vars) as Record<string, string>) : null,
        is_active: Boolean(server.is_active),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /mcp-servers/:id/toggle
 * Toggle MCP server active status
 */
router.post('/mcp-servers/:id/toggle', (req: Request, res: Response, next: NextFunction) => {
  try {
    const serverId = parseInt(req.params['id']!, 10);

    if (isNaN(serverId)) {
      throw new ValidationError('Invalid MCP server id');
    }

    const existing = getMcpServerById(serverId);
    if (!existing) {
      throw new NotFoundError('MCP Server', serverId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('MCP Server', serverId);
    }

    const server = toggleMcpServer(serverId);

    res.json({
      success: true,
      data: {
        ...server,
        args: JSON.parse(server.args) as string[],
        env_vars: server.env_vars ? (JSON.parse(server.env_vars) as Record<string, string>) : null,
        is_active: Boolean(server.is_active),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /mcp-servers/:id
 * Delete an MCP server
 */
router.delete('/mcp-servers/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const serverId = parseInt(req.params['id']!, 10);

    if (isNaN(serverId)) {
      throw new ValidationError('Invalid MCP server id');
    }

    const existing = getMcpServerById(serverId);
    if (!existing) {
      throw new NotFoundError('MCP Server', serverId);
    }

    // Check project access
    if (!userHasProjectAccess(existing.project_id, req.userId!)) {
      throw new NotFoundError('MCP Server', serverId);
    }

    deleteMcpServer(serverId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
