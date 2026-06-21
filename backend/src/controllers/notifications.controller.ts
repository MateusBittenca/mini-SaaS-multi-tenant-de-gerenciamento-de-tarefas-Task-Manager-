import { Request, Response } from 'express';
import * as notificationsService from '../services/notification.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.listAllNotifications(req.userId!, req.userEmail!);
  res.json({ data });
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.acceptInviteById(
    getParam(req, 'id'),
    req.userId!,
    req.userEmail!
  );
  res.json({ data });
});

export const declineInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.declineInviteById(
    getParam(req, 'id'),
    req.userId!,
    req.userEmail!
  );
  res.json({ data });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.markNotificationAsRead(getParam(req, 'id'), req.userId!);
  res.json({ data });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationsService.markAllAsRead(req.userId!);
  res.json({ data });
});
