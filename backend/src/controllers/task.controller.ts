import { Request, Response } from 'express';
import * as taskService from '../services/task.service';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { Role } from '@prisma/client';
import { getParam } from '../lib/params';
import { getPaginationFromRequest } from '../lib/pagination';
import { PaginationQuery, DEFAULT_PAGE_LIMIT } from '../schemas/pagination.schema';

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.listTasks(
    getParam(req, 'projectId'),
    req.workspaceMember!.workspaceId,
    getPaginationFromRequest(req)
  );
  res.json({ data });
});

export const listMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Partial<PaginationQuery> & {
    status?: string;
    overdue?: boolean;
  };
  const data = await taskService.listMyTasks(req.workspaceMember!.workspaceId, req.userId!, {
    status: query.status,
    overdue: query.overdue,
    cursor: query.cursor,
    limit: query.limit ?? DEFAULT_PAGE_LIMIT,
  });
  res.json({ data });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.getTask(getParam(req, 'id'), req.workspaceMember!.workspaceId);
  res.json({ data });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.createTask(
    getParam(req, 'projectId'),
    req.workspaceMember!.workspaceId,
    req.body,
    req.userId!
  );
  res.status(201).json({ data });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const data = await taskService.updateTask(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    req.body,
    req.userId!
  );
  res.json({ data });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.headers['x-workspace-id'] as string;
  if (!workspaceId) {
    res.status(400).json({
      error: { message: 'Workspace ID is required', code: 'WORKSPACE_REQUIRED' },
    });
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: req.userId!, workspaceId },
    },
  });

  if (!membership) {
    throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[Role.ADMIN]) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  await taskService.deleteTask(getParam(req, 'id'), workspaceId, req.userId!);
  res.json({ data: { message: 'Task deleted' } });
});
