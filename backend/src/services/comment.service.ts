import { ActivityType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { notifyTaskCommented } from './notification.service';
import { CreateCommentInput } from '../schemas/comment.schema';
import { Role } from '@prisma/client';
import { ROLE_HIERARCHY } from '../middlewares/workspace';
import { activeTaskInWorkspace } from '../lib/soft-delete';
import { emitCommentEvent } from '../ws/realtime';

const authorSelect = { id: true, name: true, email: true };

async function getTaskInWorkspace(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...activeTaskInWorkspace(workspaceId) },
  });
  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }
  return task;
}

export async function listComments(taskId: string, workspaceId: string) {
  await getTaskInWorkspace(taskId, workspaceId);

  return prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createComment(
  taskId: string,
  workspaceId: string,
  authorId: string,
  input: CreateCommentInput
) {
  const task = await getTaskInWorkspace(taskId, workspaceId);

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorId,
      content: input.content,
    },
    include: { author: { select: authorSelect } },
  });

  await logActivity({
    workspaceId,
    actorId: authorId,
    type: ActivityType.COMMENT_ADDED,
    taskId,
    projectId: task.projectId,
    metadata: { commentId: comment.id, preview: input.content.slice(0, 100) },
  });

  if (task.assigneeId) {
    const actor = await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });
    await notifyTaskCommented({
      assigneeId: task.assigneeId,
      workspaceId,
      taskId,
      projectId: task.projectId,
      actorId: authorId,
      taskTitle: task.title,
      actorName: actor?.name ?? 'Alguém',
      commentPreview: input.content.slice(0, 100),
    });
  }

  emitCommentEvent({ workspaceId, taskId, action: 'created' });
  return comment;
}

export async function deleteComment(
  taskId: string,
  commentId: string,
  workspaceId: string,
  userId: string,
  userRole: Role
) {
  const task = await getTaskInWorkspace(taskId, workspaceId);

  const comment = await prisma.taskComment.findFirst({
    where: { id: commentId, taskId },
  });

  if (!comment) {
    throw new AppError('Comment not found', 404, 'NOT_FOUND');
  }

  const isAuthor = comment.authorId === userId;
  const isAdmin = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[Role.ADMIN];

  if (!isAuthor && !isAdmin) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  await prisma.taskComment.delete({ where: { id: commentId } });

  await logActivity({
    workspaceId,
    actorId: userId,
    type: ActivityType.COMMENT_DELETED,
    taskId,
    projectId: task.projectId,
    metadata: { commentId },
  });

  emitCommentEvent({ workspaceId, taskId, action: 'deleted' });
}
