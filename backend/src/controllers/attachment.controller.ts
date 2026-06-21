import { Request, Response } from 'express';
import * as attachmentService from '../services/attachment.service';
import { asyncHandler } from '../lib/asyncHandler';
import { getParam } from '../lib/params';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { Role } from '@prisma/client';

export const listAttachments = asyncHandler(async (req: Request, res: Response) => {
  const data = await attachmentService.listAttachments(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId
  );
  res.json({ data });
});

export const uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      error: { message: 'File is required', code: 'FILE_REQUIRED' },
    });
    return;
  }

  const data = await attachmentService.createAttachment(
    getParam(req, 'id'),
    req.workspaceMember!.workspaceId,
    req.userId!,
    req.file
  );
  res.status(201).json({ data });
});

export const downloadAttachment = asyncHandler(async (req: Request, res: Response) => {
  const { attachment, absolutePath } = await attachmentService.getAttachmentForDownload(
    getParam(req, 'id'),
    getParam(req, 'attachmentId'),
    req.workspaceMember!.workspaceId
  );

  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(attachment.filename)}"`
  );

  attachmentService.createReadStream(absolutePath).pipe(res);
});

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin =
    ROLE_HIERARCHY[req.workspaceMember!.role] >= ROLE_HIERARCHY[Role.ADMIN];

  await attachmentService.deleteAttachment(
    getParam(req, 'id'),
    getParam(req, 'attachmentId'),
    req.workspaceMember!.workspaceId,
    req.userId!,
    isAdmin
  );
  res.json({ data: { message: 'Attachment deleted' } });
});
