import { Request, Response, NextFunction } from 'express';
import * as workspaceService from '../services/workspace.service';
import { AuthRequest } from '../middlewares/auth';
import { WorkspaceRequest } from '../middlewares/workspace';
import { getParam } from '../lib/params';

export async function listWorkspaces(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await workspaceService.listUserWorkspaces(authReq.userId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await workspaceService.createWorkspace(authReq.userId, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await workspaceService.inviteMember(
      wsReq.workspaceMember.workspaceId,
      req.body,
      wsReq.userId
    );
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest;
    const data = await workspaceService.acceptInvite(
      getParam(req, 'token'),
      authReq.userId,
      authReq.userEmail
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await workspaceService.listWorkspaceMembers(
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await workspaceService.getInviteByToken(getParam(req, 'token'));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const authReq = req as AuthRequest;
    const data = await workspaceService.updateMemberRole(
      wsReq.workspaceMember.workspaceId,
      getParam(req, 'memberId'),
      req.body,
      authReq.userId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const authReq = req as AuthRequest;
    const data = await workspaceService.removeMember(
      wsReq.workspaceMember.workspaceId,
      getParam(req, 'memberId'),
      authReq.userId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function listPendingInvites(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await workspaceService.listPendingWorkspaceInvites(
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function revokeInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await workspaceService.revokeInvite(
      wsReq.workspaceMember.workspaceId,
      getParam(req, 'inviteId'),
      wsReq.workspaceMember.role
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function transferOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const authReq = req as AuthRequest;
    const data = await workspaceService.transferOwnership(
      wsReq.workspaceMember.workspaceId,
      req.body.memberId,
      authReq.userId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await workspaceService.updateWorkspace(
      wsReq.workspaceMember.workspaceId,
      req.body
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
