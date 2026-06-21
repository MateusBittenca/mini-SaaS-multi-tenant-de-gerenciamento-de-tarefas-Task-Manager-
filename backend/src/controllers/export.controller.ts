import { Request, Response } from 'express';
import * as exportService from '../services/export.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';
import { TaskExportQuery } from '../schemas/export.schema';

function sendExport(res: Response, result: { contentType: string; filename: string; body: Buffer }) {
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
  res.send(result.body);
}

export const exportProjectTasks = asyncHandler(async (req: Request, res: Response) => {
  const result = await exportService.exportProjectTasks(
    getParam(req, 'projectId'),
    req.workspaceMember!.workspaceId,
    req.query as TaskExportQuery
  );
  sendExport(res, result);
});

export const exportMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const result = await exportService.exportMyTasks(
    getParam(req, 'id'),
    req.userId!,
    req.query as TaskExportQuery
  );
  sendExport(res, result);
});
