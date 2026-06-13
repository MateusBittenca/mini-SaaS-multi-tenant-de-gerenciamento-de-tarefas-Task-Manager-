import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/task.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { Role } from '@prisma/client';
import { getParam } from '../lib/params';

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await taskService.listTasks(
      getParam(req, 'projectId'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function listMyTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await taskService.listMyTasks(
      wsReq.workspaceMember.workspaceId,
      wsReq.userId,
      {
        status: req.query.status as string | undefined,
        overdue: req.query.overdue as boolean | undefined,
      }
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await taskService.getTask(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await taskService.createTask(
      getParam(req, 'projectId'),
      wsReq.workspaceMember.workspaceId,
      req.body,
      wsReq.userId
    );
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await taskService.updateTask(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId,
      req.body,
      wsReq.userId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const workspaceId = req.headers['x-workspace-id'] as string;
    if (!workspaceId) {
      res.status(400).json({
        error: { message: 'Workspace ID is required', code: 'WORKSPACE_REQUIRED' },
      });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: authReq.userId, workspaceId },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[Role.ADMIN]) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    await taskService.deleteTask(getParam(req, 'id'), workspaceId, authReq.userId);
    res.json({ data: { message: 'Task deleted' } });
  } catch (error) {
    next(error);
  }
}
