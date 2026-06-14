import { Invite } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import {
  countUnreadNotifications,
  formatNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service';

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
