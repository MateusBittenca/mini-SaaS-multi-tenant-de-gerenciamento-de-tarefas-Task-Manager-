import { Invite, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { activeOnly } from '../lib/soft-delete';
import { AppError } from '../lib/errors';
import { emitNotification } from '../ws/realtime';

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

  const notification = await prisma.notification.create({
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

  emitNotification(params.userId);
  return notification;
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
      ...activeOnly,
      project: { deletedAt: null },
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

type InviteWithWorkspace = Invite & {
  workspace: { id: string; name: string; slug: string; createdAt: Date };
  invitedBy: { id: string; name: string; email: string } | null;
};

function formatInvite(invite: InviteWithWorkspace) {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    role: invite.role,
    invitedBy: invite.invitedBy
      ? { name: invite.invitedBy.name, email: invite.invitedBy.email }
      : null,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
  };
}

function pendingInviteFilter(userId: string, userEmail: string) {
  return {
    accepted: false,
    declined: false,
    expiresAt: { gt: new Date() },
    OR: [{ userId }, { email: { equals: userEmail, mode: 'insensitive' as const } }],
  };
}

async function getInviteForUser(inviteId: string, userId: string, userEmail: string) {
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      ...pendingInviteFilter(userId, userEmail),
    },
    include: {
      workspace: true,
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invite) {
    throw new AppError('Invite not found', 404, 'NOT_FOUND');
  }

  return invite;
}

async function processAcceptInvite(
  invite: Invite & { workspace: { id: string; name: string } },
  userId: string
) {
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: invite.workspaceId,
      },
    },
  });

  if (existing) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: invite.workspaceId },
    });
    await prisma.invite.update({
      where: { id: invite.id },
      data: { accepted: true, userId },
    });
    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      role: existing.role,
      slug: workspace?.slug,
      alreadyMember: true,
    };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: invite.workspaceId },
  });

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: invite.workspaceId,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { accepted: true, userId },
    }),
  ]);

  return {
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    role: invite.role,
    slug: workspace?.slug,
    alreadyMember: false,
  };
}

export async function listPendingInvites(userId: string, userEmail: string) {
  const invites = await prisma.invite.findMany({
    where: pendingInviteFilter(userId, userEmail),
    include: {
      workspace: true,
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    unreadCount: invites.length,
    invites: invites.map(formatInvite),
  };
}

export async function listAllNotifications(userId: string, userEmail: string) {
  const [inviteData, notifications, unreadAppCount] = await Promise.all([
    listPendingInvites(userId, userEmail),
    listUserNotifications(userId),
    countUnreadNotifications(userId),
  ]);

  const actorIds = [
    ...new Set(notifications.map((n) => n.actorId).filter((id): id is string => !!id)),
  ];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));

  const workspaceIds = [...new Set(notifications.map((n) => n.workspaceId))];
  const workspaces =
    workspaceIds.length > 0
      ? await prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, name: true },
        })
      : [];
  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

  const formattedNotifications = notifications.map((n) => {
    const base = formatNotification(n);
    return {
      ...base,
      actorName: n.actorId ? (actorMap.get(n.actorId) ?? null) : null,
      workspaceName: workspaceMap.get(n.workspaceId) ?? null,
    };
  });

  return {
    unreadCount: inviteData.unreadCount + unreadAppCount,
    invites: inviteData.invites,
    notifications: formattedNotifications,
  };
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const result = await markNotificationRead(notificationId, userId);
  if (!result) {
    throw new AppError('Notification not found', 404, 'NOT_FOUND');
  }
  return result;
}

export async function markAllAsRead(userId: string) {
  await markAllNotificationsRead(userId);
  return { message: 'All notifications marked as read' };
}

export async function acceptInviteById(inviteId: string, userId: string, userEmail: string) {
  const invite = await getInviteForUser(inviteId, userId, userEmail);

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError('Invite email does not match your account', 403, 'FORBIDDEN');
  }

  return processAcceptInvite(invite, userId);
}

export async function declineInviteById(inviteId: string, userId: string, userEmail: string) {
  const invite = await getInviteForUser(inviteId, userId, userEmail);

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError('Invite email does not match your account', 403, 'FORBIDDEN');
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { declined: true, declinedAt: new Date(), userId },
  });

  return { message: 'Invite declined' };
}
