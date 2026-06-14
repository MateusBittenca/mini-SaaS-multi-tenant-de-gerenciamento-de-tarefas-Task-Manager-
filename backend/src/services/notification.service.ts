import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const actorSelect = { id: true, name: true, email: true };

export async function createNotification(params: {
  userId: string;
  workspaceId: string;
  type: NotificationType;
  taskId?: string;
  projectId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.actorId && params.actorId === params.userId) {
    return null;
  }

  if (params.type === NotificationType.TASK_DUE_SOON && params.taskId) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: params.userId,
        type: NotificationType.TASK_DUE_SOON,
        taskId: params.taskId,
        read: false,
      },
    });
    if (existing) return existing;
  }

  return prisma.notification.create({
    data: {
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: params.type,
      taskId: params.taskId ?? null,
      projectId: params.projectId ?? null,
      actorId: params.actorId ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function notifyTaskAssigned(params: {
  assigneeId: string;
  workspaceId: string;
  taskId: string;
  projectId: string;
  actorId: string;
  taskTitle: string;
  actorName: string;
}) {
  return createNotification({
    userId: params.assigneeId,
    workspaceId: params.workspaceId,
    type: NotificationType.TASK_ASSIGNED,
    taskId: params.taskId,
    projectId: params.projectId,
    actorId: params.actorId,
    metadata: {
      taskTitle: params.taskTitle,
      actorName: params.actorName,
    },
  });
}

export async function notifyTaskCommented(params: {
  assigneeId: string;
  workspaceId: string;
  taskId: string;
  projectId: string;
  actorId: string;
  taskTitle: string;
  actorName: string;
  commentPreview: string;
}) {
  return createNotification({
    userId: params.assigneeId,
    workspaceId: params.workspaceId,
    type: NotificationType.TASK_COMMENTED,
    taskId: params.taskId,
    projectId: params.projectId,
    actorId: params.actorId,
    metadata: {
      taskTitle: params.taskTitle,
      actorName: params.actorName,
      commentPreview: params.commentPreview,
    },
  });
}

export async function processDueSoonNotifications() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: { not: null },
      status: { not: 'DONE' },
      dueDate: { gte: now, lte: in24h },
    },
    include: {
      project: { select: { id: true, workspaceId: true } },
    },
  });

  let created = 0;
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    const result = await createNotification({
      userId: task.assigneeId,
      workspaceId: task.project.workspaceId,
      type: NotificationType.TASK_DUE_SOON,
      taskId: task.id,
      projectId: task.projectId,
      metadata: {
        taskTitle: task.title,
        dueDate: task.dueDate?.toISOString(),
      },
    });
    if (result) created++;
  }
  return created;
}

export async function listUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: actorSelect },
    },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    return null;
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

function formatNotification(n: Awaited<ReturnType<typeof listUserNotifications>>[number]) {
  const metadata = (n.metadata as Record<string, unknown> | null) ?? {};
  return {
    id: n.id,
    type: n.type,
    read: n.read,
    workspaceId: n.workspaceId,
    taskId: n.taskId,
    projectId: n.projectId,
    actorId: n.actorId,
    metadata,
    createdAt: n.createdAt,
  };
}

export { formatNotification };
