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
      req.body
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
