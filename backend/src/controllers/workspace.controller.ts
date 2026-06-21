import { Request, Response } from 'express';
import * as workspaceService from '../services/workspace.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';
import { getPaginationFromRequest } from '../lib/pagination';

export const listWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.listUserWorkspaces(req.userId!);
  res.json({ data });
});

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.createWorkspace(req.userId!, req.body);
  res.status(201).json({ data });
});

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.inviteMember(
    req.workspaceMember!.workspaceId,
    req.body,
    req.userId!
  );
  res.status(201).json({ data });
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.acceptInvite(
    getParam(req, 'token'),
    req.userId!,
    req.userEmail!
  );
  res.json({ data });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.listWorkspaceMembers(
    req.workspaceMember!.workspaceId,
    getPaginationFromRequest(req)
  );
  res.json({ data });
});

export const getInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.getInviteByToken(getParam(req, 'token'));
  res.json({ data });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.updateMemberRole(
    req.workspaceMember!.workspaceId,
    getParam(req, 'memberId'),
    req.body,
    req.userId!
  );
  res.json({ data });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.removeMember(
    req.workspaceMember!.workspaceId,
    getParam(req, 'memberId'),
    req.userId!
  );
  res.json({ data });
});

export const listPendingInvites = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.listPendingWorkspaceInvites(
    req.workspaceMember!.workspaceId
  );
  res.json({ data });
});

export const revokeInvite = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.revokeInvite(
    req.workspaceMember!.workspaceId,
    getParam(req, 'inviteId'),
    req.workspaceMember!.role
  );
  res.json({ data });
});

export const transferOwnership = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.transferOwnership(
    req.workspaceMember!.workspaceId,
    req.body.memberId,
    req.userId!
  );
  res.json({ data });
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.updateWorkspace(req.workspaceMember!.workspaceId, req.body);
  res.json({ data });
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const data = await workspaceService.getWorkspaceOverview(req.workspaceMember!.workspaceId);
  res.json({ data });
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const data = await workspaceService.searchWorkspace(req.workspaceMember!.workspaceId, q);
  res.json({ data });
});
