import { Request, Response } from 'express';
import * as projectService from '../services/project.service';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { Role } from '@prisma/client';
import { getParam } from '../lib/params';
import { getPaginationFromRequest } from '../lib/pagination';

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const data = await projectService.listProjects(
    req.workspaceMember!.workspaceId,
    getPaginationFromRequest(req)
  );
  res.json({ data });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const data = await projectService.createProject(req.workspaceMember!.workspaceId, req.body);
  res.status(201).json({ data });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
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

  await projectService.deleteProject(getParam(req, 'id'), workspaceId);
  res.json({ data: { message: 'Project deleted' } });
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const data = await projectService.getProjectInWorkspace(
    getParam(req, 'projectId'),
    req.workspaceMember!.workspaceId
  );
  res.json({ data });
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const data = await projectService.updateProject(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    req.body
  );
  res.json({ data });
});
