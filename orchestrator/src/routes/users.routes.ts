import { Router, Request, Response, NextFunction } from 'express';
import { getUserById, updateUser } from '../services/user.service';
import { NotFoundError, ValidationError } from '../types';

const router = Router();

/**
 * GET /users/me - Get current user profile
 */
router.get('/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getUserById(req.userId!);

    if (!user) {
      throw new NotFoundError('User', req.userId!);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /users/me - Update current user profile
 */
router.put('/me', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { display_name, avatar_url } = body;

    if (display_name !== undefined && typeof display_name !== 'string') {
      throw new ValidationError('display_name must be a string');
    }

    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      throw new ValidationError('avatar_url must be a string or null');
    }

    const user = updateUser(req.userId!, {
      display_name,
      avatar_url: avatar_url as string | undefined,
    });

    if (!user) {
      throw new NotFoundError('User', req.userId!);
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
