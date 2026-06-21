import { Request, Response } from 'express';
import * as subtaskService from '../services/subtask.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';

export const listSubtasks = asyncHandler(async (req: Request, res: Response) => {
  const data = await subtaskService.listSubtasks(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId
  );
  res.json({ data });
});

export const createSubtask = asyncHandler(async (req: Request, res: Response) => {
  const data = await subtaskService.createSubtask(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    req.body
  );
  res.status(201).json({ data });
});

export const updateSubtask = asyncHandler(async (req: Request, res: Response) => {
  const data = await subtaskService.updateSubtask(
    getParam(req, 'subtaskId'),
    req.workspaceMember!.workspaceId,
    req.body
  );
  res.json({ data });
});

export const deleteSubtask = asyncHandler(async (req: Request, res: Response) => {
  await subtaskService.deleteSubtask(getParam(req, 'subtaskId'), req.workspaceMember!.workspaceId);
  res.json({ data: { message: 'Subtask deleted' } });
});
