import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { Role } from '@prisma/client';
import { getParam } from '../lib/params';

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await projectService.listProjects(wsReq.workspaceMember.workspaceId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await projectService.createProject(
      wsReq.workspaceMember.workspaceId,
      req.body
    );
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
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

    await projectService.deleteProject(getParam(req, 'id'), workspaceId);
    res.json({ data: { message: 'Project deleted' } });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await projectService.getProjectInWorkspace(
      getParam(req, 'projectId'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
