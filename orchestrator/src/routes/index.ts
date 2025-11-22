import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    },
  });
});

// API routes will be added here
// router.use('/projects', projectRoutes);
// router.use('/epics', epicRoutes);
// router.use('/tasks', taskRoutes);
// router.use('/repositories', repositoryRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/users', userRoutes);
// router.use('/files', fileRoutes);

export default router;
