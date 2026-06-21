import { createReadStream, promises as fs } from 'fs';
import { MulterError } from 'multer';
import { ActivityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { activeTaskInWorkspace } from '../lib/soft-delete';
import {
  buildStorageKey,
  getAttachmentAbsolutePath,
  getMaxUploadBytes,
} from '../lib/upload';
import { emitTaskEvent } from '../ws/realtime';

const uploaderSelect = { id: true, name: true, email: true };

export async function listAttachments(taskId: string, workspaceId: string) {
  await assertTaskInWorkspace(taskId, workspaceId);

  return prisma.taskAttachment.findMany({
    where: { taskId },
    include: { uploadedBy: { select: uploaderSelect } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAttachment(
  taskId: string,
  workspaceId: string,
  uploadedById: string,
  file: Express.Multer.File
) {
  const task = await assertTaskInWorkspace(taskId, workspaceId);

  const storageKey = buildStorageKey(taskId, file.filename);

  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      uploadedById,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
    },
    include: { uploadedBy: { select: uploaderSelect } },
  });

  await logActivity({
    workspaceId,
    actorId: uploadedById,
    type: ActivityType.ATTACHMENT_ADDED,
    taskId,
    projectId: task.projectId,
    metadata: { attachmentId: attachment.id, filename: attachment.filename },
  });

  emitTaskEvent({
    workspaceId,
    projectId: task.projectId,
    taskId,
    action: 'updated',
  });

  return attachment;
}

export async function getAttachmentForDownload(
  taskId: string,
  attachmentId: string,
  workspaceId: string
) {
  await assertTaskInWorkspace(taskId, workspaceId);

  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
  });

  if (!attachment) {
    throw new AppError('Attachment not found', 404, 'NOT_FOUND');
  }

  const absolutePath = getAttachmentAbsolutePath(attachment.storageKey);
  try {
    await fs.access(absolutePath);
  } catch {
    throw new AppError('Attachment file missing', 404, 'NOT_FOUND');
  }

  return { attachment, absolutePath };
}

export async function deleteAttachment(
  taskId: string,
  attachmentId: string,
  workspaceId: string,
  actorId: string,
  isAdmin: boolean
) {
  const task = await assertTaskInWorkspace(taskId, workspaceId);

  const attachment = await prisma.taskAttachment.findFirst({
    where: { id: attachmentId, taskId },
  });

  if (!attachment) {
    throw new AppError('Attachment not found', 404, 'NOT_FOUND');
  }

  if (attachment.uploadedById !== actorId && !isAdmin) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  const absolutePath = getAttachmentAbsolutePath(attachment.storageKey);
  await fs.unlink(absolutePath).catch(() => undefined);

  await logActivity({
    workspaceId,
    actorId,
    type: ActivityType.ATTACHMENT_DELETED,
    taskId,
    projectId: task.projectId,
    metadata: { attachmentId, filename: attachment.filename },
  });

  emitTaskEvent({
    workspaceId,
    projectId: task.projectId,
    taskId,
    action: 'updated',
  });
}

export function mapUploadError(err: unknown): AppError | null {
  if (!(err instanceof Error)) return null;

  if (err.message === 'UNSUPPORTED_FILE_TYPE') {
    return new AppError('File type not allowed', 400, 'UNSUPPORTED_FILE_TYPE');
  }

  if (err.message === 'File too large' || (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE')) {
    return new AppError(
      `File exceeds maximum size of ${Math.round(getMaxUploadBytes() / (1024 * 1024))}MB`,
      400,
      'FILE_TOO_LARGE'
    );
  }

  return null;
}

async function assertTaskInWorkspace(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...activeTaskInWorkspace(workspaceId) },
    select: { id: true, projectId: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  return task;
}

export { createReadStream };
