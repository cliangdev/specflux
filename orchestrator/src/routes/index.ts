import { Router } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import projectRoutes from './projects.routes';
import releaseRoutes from './releases.routes';
import epicRoutes from './epics.routes';
import taskRoutes from './tasks.routes';
import repositoryRoutes from './repositories.routes';
import notificationRoutes from './notifications.routes';
import userRoutes from './users.routes';
import fileRoutes from './files.routes';
import agentRoutes from './agent.routes';
import agentsRoutes from './agents.routes';
import skillsRoutes from './skills.routes';
import mcpServersRoutes from './mcp-servers.routes';

const router = Router();

// Health check endpoint (no auth required)
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
    },
  });
});

// Apply optional auth middleware to all routes below
// Auth is not required during early development
router.use(optionalAuthMiddleware);

// User routes
router.use('/users', userRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Release routes (mixed - some under /projects, some under /releases)
router.use(releaseRoutes);

// Epic routes (mixed - some under /projects, some under /epics)
router.use(epicRoutes);

// Task routes (mixed - some under /projects, some under /tasks)
router.use(taskRoutes);

// Repository routes (mixed - some under /projects, some under /repositories)
router.use(repositoryRoutes);

// Notification routes (mixed - some under /projects, some under /notifications)
router.use(notificationRoutes);

// File routes
router.use(fileRoutes);

// Agent routes (for Claude Code agent management - sessions)
router.use(agentRoutes);

// Agents routes (for agent definitions CRUD)
router.use(agentsRoutes);

// Skills routes (for skill definitions CRUD)
router.use(skillsRoutes);

// MCP Servers routes (for MCP server configurations CRUD)
router.use(mcpServersRoutes);

export default router;
