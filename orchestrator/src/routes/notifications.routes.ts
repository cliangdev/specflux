import { Router, Request, Response, NextFunction } from 'express';
import {
  listNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/notification.service';
import { userHasProjectAccess } from '../services/project.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /projects/:projectId/notifications - List notifications for a project
 */
router.get(
  '/projects/:projectId/notifications',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const { unread_only, limit } = req.query;

      const notifications = listNotifications(projectId, req.userId!, {
        unreadOnly: unread_only === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /projects/:projectId/notifications/read-all - Mark all notifications as read
 */
router.patch(
  '/projects/:projectId/notifications/read-all',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params['projectId']!, 10);

      if (isNaN(projectId)) {
        throw new ValidationError('Invalid project id');
      }

      if (!userHasProjectAccess(projectId, req.userId!)) {
        throw new NotFoundError('Project', projectId);
      }

      const count = markAllNotificationsRead(projectId, req.userId!);

      res.json({ success: true, data: { marked_read: count } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /notifications/:id - Get notification details
 */
router.get('/notifications/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params['id']!, 10);

    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification id');
    }

    const notification = getNotificationById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notification', notificationId);
    }

    // Verify user owns this notification
    if (notification.user_id !== req.userId!) {
      throw new NotFoundError('Notification', notificationId);
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /notifications/:id - Update notification (mark as read)
 */
router.patch('/notifications/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params['id']!, 10);

    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification id');
    }

    const existingNotification = getNotificationById(notificationId);

    if (!existingNotification) {
      throw new NotFoundError('Notification', notificationId);
    }

    // Verify user owns this notification
    if (existingNotification.user_id !== req.userId!) {
      throw new NotFoundError('Notification', notificationId);
    }

    const notification = markNotificationRead(notificationId);

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /notifications/:id - Delete notification
 */
router.delete('/notifications/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params['id']!, 10);

    if (isNaN(notificationId)) {
      throw new ValidationError('Invalid notification id');
    }

    const existingNotification = getNotificationById(notificationId);

    if (!existingNotification) {
      throw new NotFoundError('Notification', notificationId);
    }

    // Verify user owns this notification
    if (existingNotification.user_id !== req.userId!) {
      throw new NotFoundError('Notification', notificationId);
    }

    deleteNotification(notificationId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
