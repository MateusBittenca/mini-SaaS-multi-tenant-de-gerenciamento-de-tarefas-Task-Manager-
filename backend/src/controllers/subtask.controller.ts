import { Request, Response, NextFunction } from 'express';
import * as subtaskService from '../services/subtask.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { getParam } from '../lib/params';

export async function listSubtasks(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await subtaskService.listSubtasks(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await subtaskService.createSubtask(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId,
      req.body
    );
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await subtaskService.updateSubtask(
      getParam(req, 'subtaskId'),
      wsReq.workspaceMember.workspaceId,
      req.body
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function deleteSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    await subtaskService.deleteSubtask(
      getParam(req, 'subtaskId'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data: { message: 'Subtask deleted' } });
  } catch (error) {
    next(error);
  }
}
