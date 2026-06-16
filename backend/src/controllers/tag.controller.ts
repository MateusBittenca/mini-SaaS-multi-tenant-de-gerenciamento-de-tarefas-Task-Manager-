import { Request, Response, NextFunction } from 'express';
import * as tagService from '../services/tag.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { getParam } from '../lib/params';

export async function listTags(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await tagService.listTags(wsReq.workspaceMember.workspaceId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await tagService.createTag(wsReq.workspaceMember.workspaceId, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    await tagService.deleteTag(getParam(req, 'id'), wsReq.workspaceMember.workspaceId);
    res.json({ data: { message: 'Tag deleted' } });
  } catch (error) {
    next(error);
  }
}
