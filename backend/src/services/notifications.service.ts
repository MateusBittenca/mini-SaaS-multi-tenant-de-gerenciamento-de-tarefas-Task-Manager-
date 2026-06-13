import { Invite } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

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
