import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { generateUniqueSlug } from '../lib/slug';
import { CreateWorkspaceInput, InviteMemberInput } from '../schemas/workspace.schema';

export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    role: m.role,
    joinedAt: m.joinedAt,
    createdAt: m.workspace.createdAt,
  }));
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const slug = await generateUniqueSlug(input.name, async (s) => {
    const existing = await prisma.workspace.findUnique({ where: { slug: s } });
    return !!existing;
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      slug,
      members: {
        create: {
          userId,
          role: Role.OWNER,
        },
      },
    },
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role: Role.OWNER,
    createdAt: workspace.createdAt,
  };
}

export async function inviteMember(
  workspaceId: string,
  input: InviteMemberInput
) {
  const existingMember = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      memberships: { where: { workspaceId } },
    },
  });

  if (existingMember?.memberships.length) {
    throw new AppError('User is already a member', 409, 'ALREADY_MEMBER');
  }

  const pendingInvite = await prisma.invite.findFirst({
    where: {
      workspaceId,
      email: input.email,
      accepted: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (pendingInvite) {
    throw new AppError('Invite already sent', 409, 'INVITE_EXISTS');
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invite.create({
    data: {
      workspaceId,
      email: input.email,
      role: input.role,
      token,
      expiresAt,
    },
    include: { workspace: true },
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
    workspaceName: invite.workspace.name,
  };
}

export async function acceptInvite(token: string, userId: string, userEmail: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    throw new AppError('Invite not found', 404, 'NOT_FOUND');
  }

  if (invite.accepted) {
    throw new AppError('Invite already accepted', 400, 'INVITE_ACCEPTED');
  }

  if (invite.expiresAt < new Date()) {
    throw new AppError('Invite has expired', 400, 'INVITE_EXPIRED');
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new AppError('Invite email does not match your account', 403, 'FORBIDDEN');
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: invite.workspaceId,
      },
    },
  });

  if (existing) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { accepted: true },
    });
    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      alreadyMember: true,
    };
  }

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
      data: { accepted: true },
    }),
  ]);

  return {
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    role: invite.role,
    alreadyMember: false,
  };
}

export async function listWorkspaceMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) {
    throw new AppError('Invite not found', 404, 'NOT_FOUND');
  }

  return {
    email: invite.email,
    role: invite.role,
    accepted: invite.accepted,
    expired: invite.expiresAt < new Date(),
    workspaceName: invite.workspace.name,
    workspaceId: invite.workspaceId,
  };
}
