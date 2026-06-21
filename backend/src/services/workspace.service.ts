import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { generateUniqueSlug } from '../lib/slug';
import { sendInviteEmail } from './email.service';
import { CreateWorkspaceInput, InviteMemberInput, UpdateMemberRoleInput, UpdateWorkspaceInput } from '../schemas/workspace.schema';
import { PaginationQuery } from '../schemas/pagination.schema';
import { buildPaginatedResult, getPrismaPaginationArgs } from '../lib/pagination';
import { searchProjectsInWorkspace, searchTasksInWorkspace } from '../lib/trgm-search';
import { activeOnly, activeProjectInWorkspace, activeTaskInWorkspace } from '../lib/soft-delete';

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

export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput
) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw new AppError('Workspace not found', 404, 'NOT_FOUND');
  }

  const slug = await generateUniqueSlug(input.name, async (s) => {
    if (s === workspace.slug) return false;
    const existing = await prisma.workspace.findUnique({ where: { slug: s } });
    return !!existing;
  });

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: input.name, slug },
  });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    createdAt: updated.createdAt,
  };
}

export async function inviteMember(
  workspaceId: string,
  input: InviteMemberInput,
  invitedById: string
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
      declined: false,
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
      userId: existingMember?.id ?? null,
      invitedById,
    },
    include: {
      workspace: true,
      invitedBy: { select: { name: true } },
    },
  });

  const emailSent = await sendInviteEmail({
    to: invite.email,
    workspaceName: invite.workspace.name,
    invitedByName: invite.invitedBy?.name ?? 'Um membro da equipe',
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  const devInviteUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/invites/${invite.token}`;

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
    workspaceName: invite.workspace.name,
    emailSent,
    ...(isDev && !emailSent ? { devInviteUrl } : {}),
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

  if (invite.declined) {
    throw new AppError('Invite was declined', 400, 'INVITE_DECLINED');
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
      data: { accepted: true, userId },
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
      data: { accepted: true, userId },
    }),
  ]);

  return {
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    role: invite.role,
    alreadyMember: false,
  };
}

export async function listWorkspaceMembers(workspaceId: string, pagination: PaginationQuery) {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    ...getPrismaPaginationArgs(pagination.cursor, pagination.limit),
  });

  const items = rows.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  return buildPaginatedResult(items, pagination.limit);
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
    declined: invite.declined,
    expired: invite.expiresAt < new Date(),
    workspaceName: invite.workspace.name,
    workspaceId: invite.workspaceId,
  };
}

async function getMemberOrThrow(workspaceId: string, memberId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!member) {
    throw new AppError('Member not found', 404, 'NOT_FOUND');
  }
  return member;
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  input: UpdateMemberRoleInput,
  actorUserId: string
) {
  const actor = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: actorUserId, workspaceId } },
  });
  if (!actor || actor.role !== Role.OWNER) {
    throw new AppError('Only the owner can change member roles', 403, 'FORBIDDEN');
  }

  const target = await getMemberOrThrow(workspaceId, memberId);

  if (target.role === Role.OWNER) {
    throw new AppError('Cannot change the owner role. Use transfer ownership.', 400, 'INVALID_OPERATION');
  }

  if (target.userId === actorUserId) {
    throw new AppError('Cannot change your own role', 400, 'INVALID_OPERATION');
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: input.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return {
    id: updated.id,
    userId: updated.user.id,
    name: updated.user.name,
    email: updated.user.email,
    role: updated.role,
    joinedAt: updated.joinedAt,
  };
}

export async function removeMember(
  workspaceId: string,
  memberId: string,
  actorUserId: string
) {
  const actor = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: actorUserId, workspaceId } },
  });
  if (!actor || (actor.role !== Role.OWNER && actor.role !== Role.ADMIN)) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  const target = await getMemberOrThrow(workspaceId, memberId);

  if (target.role === Role.OWNER) {
    throw new AppError('Cannot remove the workspace owner', 400, 'INVALID_OPERATION');
  }

  if (target.userId === actorUserId) {
    throw new AppError('Cannot remove yourself', 400, 'INVALID_OPERATION');
  }

  if (actor.role === Role.ADMIN && target.role !== Role.MEMBER) {
    throw new AppError('Admins can only remove members', 403, 'FORBIDDEN');
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
  return { message: 'Member removed' };
}

export async function listPendingWorkspaceInvites(workspaceId: string) {
  const invites = await prisma.invite.findMany({
    where: {
      workspaceId,
      accepted: false,
      declined: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    invitedBy: invite.invitedBy
      ? { name: invite.invitedBy.name, email: invite.invitedBy.email }
      : null,
  }));
}

export async function revokeInvite(
  workspaceId: string,
  inviteId: string,
  actorRole: Role
) {
  if (actorRole !== Role.OWNER && actorRole !== Role.ADMIN) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, workspaceId, accepted: false, declined: false },
  });

  if (!invite) {
    throw new AppError('Invite not found', 404, 'NOT_FOUND');
  }

  await prisma.invite.update({
    where: { id: inviteId },
    data: { declined: true, declinedAt: new Date() },
  });

  return { message: 'Invite revoked' };
}

export async function transferOwnership(
  workspaceId: string,
  newOwnerMemberId: string,
  currentOwnerUserId: string
) {
  const currentOwner = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: currentOwnerUserId, workspaceId } },
  });

  if (!currentOwner || currentOwner.role !== Role.OWNER) {
    throw new AppError('Only the owner can transfer ownership', 403, 'FORBIDDEN');
  }

  const newOwner = await getMemberOrThrow(workspaceId, newOwnerMemberId);

  if (newOwner.userId === currentOwnerUserId) {
    throw new AppError('Cannot transfer ownership to yourself', 400, 'INVALID_OPERATION');
  }

  await prisma.$transaction([
    prisma.workspaceMember.update({
      where: { id: currentOwner.id },
      data: { role: Role.ADMIN },
    }),
    prisma.workspaceMember.update({
      where: { id: newOwnerMemberId },
      data: { role: Role.OWNER },
    }),
  ]);

  return {
    message: 'Ownership transferred',
    newOwnerId: newOwner.userId,
    newOwnerName: newOwner.user.name,
  };
}

export async function getWorkspaceOverview(workspaceId: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    totalTasks,
    totalProjects,
    statusGroups,
    memberGroups,
    taskCountsByProject,
    dueSoon,
  ] = await Promise.all([
    prisma.task.count({ where: activeTaskInWorkspace(workspaceId) }),
    prisma.project.count({ where: activeProjectInWorkspace(workspaceId) }),
    prisma.task.groupBy({
      by: ['status'],
      where: activeTaskInWorkspace(workspaceId),
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...activeTaskInWorkspace(workspaceId), assigneeId: { not: null } },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: activeTaskInWorkspace(workspaceId),
      _count: { projectId: true },
      orderBy: { _count: { projectId: 'desc' } },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        ...activeTaskInWorkspace(workspaceId),
        status: { not: 'DONE' },
        dueDate: { gte: now, lte: in7Days },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const group of statusGroups) {
    tasksByStatus[group.status]++;
  }

  const assigneeIds = memberGroups
    .map((g) => g.assigneeId)
    .filter((id): id is string => id !== null);

  const assignees =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true },
        })
      : [];

  const assigneeMap = new Map(assignees.map((a) => [a.id, a.name]));

  const tasksByMember = memberGroups
    .filter((g): g is typeof g & { assigneeId: string } => g.assigneeId !== null)
    .map((g) => ({
      userId: g.assigneeId,
      name: assigneeMap.get(g.assigneeId) ?? 'Unknown',
      count: g._count,
    }))
    .sort((a, b) => b.count - a.count);

  const projectIds = taskCountsByProject.map((g) => g.projectId);
  const projectsById =
    projectIds.length > 0
      ? new Map(
          (
            await prisma.project.findMany({
              where: { id: { in: projectIds }, ...activeProjectInWorkspace(workspaceId) },
              select: { id: true, name: true },
            })
          ).map((p) => [p.id, p])
        )
      : new Map<string, { id: string; name: string }>();

  const topProjects = taskCountsByProject
    .map((g) => {
      const project = projectsById.get(g.projectId);
      if (!project) return null;
      return {
        id: project.id,
        name: project.name,
        taskCount: g._count.projectId,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return {
    totalTasks,
    totalProjects,
    tasksByStatus,
    tasksByMember,
    topProjects,
    dueSoon,
  };
}

export async function searchWorkspace(workspaceId: string, query: string) {
  const q = query.trim();
  if (q.length < 2) {
    throw new AppError('Query must be at least 2 characters', 400, 'INVALID_QUERY');
  }

  const [tasks, projects] = await Promise.all([
    searchTasksInWorkspace(workspaceId, q),
    searchProjectsInWorkspace(workspaceId, q),
  ]);

  return { tasks, projects };
}
