import { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/comment.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { getParam } from '../lib/params';

export async function listComments(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await commentService.listComments(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createComment(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await commentService.createComment(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId,
      wsReq.userId,
      req.body
    );
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    await commentService.deleteComment(
      getParam(req, 'id'),
      getParam(req, 'commentId'),
      wsReq.workspaceMember.workspaceId,
      wsReq.userId,
      wsReq.workspaceMember.role
    );
    res.json({ data: { message: 'Comment deleted' } });
  } catch (error) {
    next(error);
  }
}
