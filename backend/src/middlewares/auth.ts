import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from '../lib/errors';

export interface AuthRequest extends Request {
  userId: string;
  userEmail: string;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).userEmail = payload.email;

    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
  }
}
