import { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activity.service';
import { WorkspaceRequest } from '../middlewares/workspace';
import { getParam } from '../lib/params';

export async function listTaskActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const wsReq = req as WorkspaceRequest;
    const data = await activityService.listTaskActivity(
      getParam(req, 'id'),
      wsReq.workspaceMember.workspaceId
    );
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
