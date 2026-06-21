import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../lib/asyncHandler';
import { REFRESH_COOKIE_NAME } from '../lib/jwt';
import { getParam } from '../lib/params';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.registerUser(req.body, res);
  res.status(201).json({ data });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.loginUser(req.body, res);
  res.json({ data });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    res.status(401).json({
      error: { message: 'Refresh token not found', code: 'UNAUTHORIZED' },
    });
    return;
  }
  const data = await authService.refreshAccessToken(refreshToken, res);
  res.json({ data });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  await authService.logoutUser(refreshToken, res);
  res.json({ data: { message: 'Logged out successfully' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.getCurrentUser(req.userId!);
  res.json({ data });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.updateProfile(req.userId!, req.body);
  res.json({ data });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.requestPasswordReset(req.body);
  res.json({ data });
});

export const getResetToken = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.getPasswordResetToken(getParam(req, 'token'));
  res.json({ data });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.resetPassword(getParam(req, 'token'), req.body);
  res.json({ data });
});
