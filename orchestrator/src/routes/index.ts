import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import projectRoutes from './projects.routes';
import epicRoutes from './epics.routes';
import taskRoutes from './tasks.routes';
import repositoryRoutes from './repositories.routes';
import notificationRoutes from './notifications.routes';
import userRoutes from './users.routes';
import fileRoutes from './files.routes';

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

// Apply auth middleware to all routes below
router.use(authMiddleware);

// User routes
router.use('/users', userRoutes);

// Project routes
router.use('/projects', projectRoutes);

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

export default router;
