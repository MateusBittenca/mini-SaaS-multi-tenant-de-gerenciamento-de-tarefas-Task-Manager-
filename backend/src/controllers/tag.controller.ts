import { Request, Response } from 'express';
import * as tagService from '../services/tag.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';

export const listTags = asyncHandler(async (req: Request, res: Response) => {
  const data = await tagService.listTags(req.workspaceMember!.workspaceId);
  res.json({ data });
});

export const createTag = asyncHandler(async (req: Request, res: Response) => {
  const data = await tagService.createTag(req.workspaceMember!.workspaceId, req.body);
  res.status(201).json({ data });
});

export const deleteTag = asyncHandler(async (req: Request, res: Response) => {
  await tagService.deleteTag(getParam(req, 'id'), req.workspaceMember!.workspaceId);
  res.json({ data: { message: 'Tag deleted' } });
});
