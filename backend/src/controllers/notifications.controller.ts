import { Request, Response, NextFunction } from 'express';
import * as notificationsService from '../services/notifications.service';
import { AuthRequest } from '../middlewares/auth';
import { getParam } from '../lib/params';

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await notificationsService.listAllNotifications(
      authReq.userId,
      authReq.userEmail
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await notificationsService.acceptInviteById(
      getParam(req, 'id'),
      authReq.userId,
      authReq.userEmail
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function declineInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await notificationsService.declineInviteById(
      getParam(req, 'id'),
      authReq.userId,
      authReq.userEmail
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await notificationsService.markNotificationAsRead(
      getParam(req, 'id'),
      authReq.userId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await notificationsService.markAllAsRead(authReq.userId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
