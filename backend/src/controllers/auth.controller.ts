import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { REFRESH_COOKIE_NAME } from '../lib/jwt';
import { AuthRequest } from '../middlewares/auth';
import { getParam } from '../lib/params';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.registerUser(req.body, res);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.loginUser(req.body, res);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({
        error: { message: 'Refresh token not found', code: 'UNAUTHORIZED' },
      });
      return;
    }
    const data = await authService.refreshAccessToken(refreshToken);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    authService.logoutUser(res);
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await authService.getCurrentUser(authReq.userId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await authService.updateProfile(authReq.userId, req.body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.requestPasswordReset(req.body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getResetToken(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getPasswordResetToken(getParam(req, 'token'));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.resetPassword(getParam(req, 'token'), req.body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
