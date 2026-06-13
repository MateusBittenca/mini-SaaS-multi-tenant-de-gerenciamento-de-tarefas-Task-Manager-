import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { AuthRequest } from './auth';
import { getParam } from '../lib/params';

export interface WorkspaceMemberContext {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
}

export interface WorkspaceRequest extends AuthRequest {
  workspaceMember: WorkspaceMemberContext;
}

export async function workspaceMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    const workspaceId =
      (req.headers['x-workspace-id'] as string | undefined) ||
      getParam(req, 'workspaceId') ||
      getParam(req, 'id');

    if (!workspaceId) {
      throw new AppError('Workspace ID is required', 400, 'WORKSPACE_REQUIRED');
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: authReq.userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    (req as WorkspaceRequest).workspaceMember = membership;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const wsReq = req as WorkspaceRequest;
    if (!roles.includes(wsReq.workspaceMember.role)) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function requireMinRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const wsReq = req as WorkspaceRequest;
    if (ROLE_HIERARCHY[wsReq.workspaceMember.role] < ROLE_HIERARCHY[minRole]) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
