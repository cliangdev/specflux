import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/user.service';

/**
 * Authentication middleware for desktop app
 * Extracts user ID from X-User-Id header and validates user exists
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userIdHeader = req.headers['x-user-id'];

  if (!userIdHeader) {
    res.status(401).json({
      success: false,
      error: 'Missing X-User-Id header',
    });
    return;
  }

  const userId = parseInt(userIdHeader as string, 10);

  if (isNaN(userId)) {
    res.status(401).json({
      success: false,
      error: 'Invalid X-User-Id header: must be a number',
    });
    return;
  }

  const user = getUserById(userId);

  if (!user) {
    res.status(401).json({
      success: false,
      error: `User with id ${userId} not found`,
    });
    return;
  }

  // Attach user ID to request for use in route handlers
  req.userId = userId;
  next();
}

/**
 * Optional auth middleware - sets userId if present but doesn't require it
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const userIdHeader = req.headers['x-user-id'];

  if (userIdHeader) {
    const userId = parseInt(userIdHeader as string, 10);
    if (!isNaN(userId)) {
      const user = getUserById(userId);
      if (user) {
        req.userId = userId;
      }
    }
  }

  next();
}
