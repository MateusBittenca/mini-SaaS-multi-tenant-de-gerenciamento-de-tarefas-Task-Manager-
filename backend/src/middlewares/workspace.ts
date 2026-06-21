import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { getParam } from '../lib/params';
import type { WorkspaceMemberContext } from '../types/request-context';

export type { WorkspaceMemberContext };

export async function workspaceMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

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
          userId: req.userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }

    req.workspaceMember = membership satisfies WorkspaceMemberContext;
    req.log = req.log.child({ workspaceId: membership.workspaceId });
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember || !roles.includes(req.workspaceMember.role)) {
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
    if (
      !req.workspaceMember ||
      ROLE_HIERARCHY[req.workspaceMember.role] < ROLE_HIERARCHY[minRole]
    ) {
      next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
