import { Request, Response } from 'express';
import * as commentService from '../services/comment.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const data = await commentService.listComments(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId
  );
  res.json({ data });
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const data = await commentService.createComment(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    req.userId!,
    req.body
  );
  res.status(201).json({ data });
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  await commentService.deleteComment(
    getParam(req, 'id'),
    getParam(req, 'commentId'),
    req.workspaceMember!.workspaceId,
    req.userId!,
    req.workspaceMember!.role
  );
  res.json({ data: { message: 'Comment deleted' } });
});
