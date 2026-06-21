import { Request, Response } from 'express';
import * as activityService from '../services/activity.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';
import { getPaginationFromRequest } from '../lib/pagination';

export const listTaskActivity = asyncHandler(async (req: Request, res: Response) => {
  const data = await activityService.listTaskActivity(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    getPaginationFromRequest(req)
  );
  res.json({ data });
});
