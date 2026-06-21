import { ActivityType } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { notifyTaskAssigned } from './notification.service';
import { validateTagIds } from './tag.service';
import { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema';
import { PaginationQuery } from '../schemas/pagination.schema';
import { buildPaginatedResult, getPrismaPaginationArgs } from '../lib/pagination';
import { activeOnly, activeProjectInWorkspace, activeTaskInWorkspace } from '../lib/soft-delete';
import { emitTaskEvent } from '../ws/realtime';

const actorSelect = { id: true, name: true, email: true };
const taskInclude = {
  assignee: { select: actorSelect },
  subtasks: { select: { completed: true } },
  tags: true,
} as const;

export async function listTasks(
  projectId: string,
  workspaceId: string,
  pagination: PaginationQuery
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...activeProjectInWorkspace(workspaceId) },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const rows = await prisma.task.findMany({
    where: { projectId, ...activeOnly },
    include: taskInclude,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    ...getPrismaPaginationArgs(pagination.cursor, pagination.limit),
  });

  return buildPaginatedResult(rows, pagination.limit);
}

export async function listMyTasks(
  workspaceId: string,
  userId: string,
  filters: { status?: string; overdue?: boolean } & PaginationQuery
) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const rows = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      ...activeTaskInWorkspace(workspaceId),
      ...(filters?.status && { status: filters.status as TaskStatus }),
      ...(filters?.overdue && {
        dueDate: { lt: now },
        NOT: { status: TaskStatus.DONE },
      }),
    },
    include: {
      assignee: { select: actorSelect },
      project: { select: { id: true, name: true } },
      tags: true,
    },
    orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    ...getPrismaPaginationArgs(filters.cursor, filters.limit),
  });

  return buildPaginatedResult(rows, filters.limit);
}

export async function getTask(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...activeTaskInWorkspace(workspaceId),
    },
    include: taskInclude,
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  return task;
}

export async function createTask(
  projectId: string,
  workspaceId: string,
  input: CreateTaskInput,
  actorId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...activeProjectInWorkspace(workspaceId) },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  if (input.assigneeId) {
    await validateAssignee(input.assigneeId, workspaceId);
  }

  if (input.tagIds?.length) {
    await validateTagIds(input.tagIds, workspaceId);
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      ...(input.tagIds?.length && {
        tags: { connect: input.tagIds.map((id) => ({ id })) },
      }),
    },
    include: taskInclude,
  });

  await logActivity({
    workspaceId,
    actorId,
    type: ActivityType.TASK_CREATED,
    taskId: task.id,
    projectId,
    metadata: { title: task.title },
  });

  if (task.assigneeId) {
    await logActivity({
      workspaceId,
      actorId,
      type: ActivityType.TASK_ASSIGNED,
      taskId: task.id,
      projectId,
      metadata: { assigneeId: task.assigneeId, assigneeName: task.assignee?.name },
    });

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });
    await notifyTaskAssigned({
      assigneeId: task.assigneeId,
      workspaceId,
      taskId: task.id,
      projectId,
      actorId,
      taskTitle: task.title,
      actorName: actor?.name ?? 'Alguém',
    });
  }

  emitTaskEvent({
    workspaceId,
    projectId,
    taskId: task.id,
    action: 'created',
  });

  return task;
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  input: UpdateTaskInput,
  actorId: string
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...activeTaskInWorkspace(workspaceId),
    },
    include: { assignee: { select: actorSelect } },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  if (input.assigneeId) {
    await validateAssignee(input.assigneeId, workspaceId);
  }

  if (input.tagIds !== undefined) {
    await validateTagIds(input.tagIds, workspaceId);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.tagIds !== undefined && {
        tags: { set: input.tagIds.map((id) => ({ id })) },
      }),
    },
    include: taskInclude,
  });

  if (input.status !== undefined && input.status !== task.status) {
    await logActivity({
      workspaceId,
      actorId,
      type: ActivityType.TASK_STATUS_CHANGED,
      taskId,
      projectId: task.projectId,
      metadata: { from: task.status, to: input.status },
    });
  }

  if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
    await logActivity({
      workspaceId,
      actorId,
      type: input.assigneeId ? ActivityType.TASK_ASSIGNED : ActivityType.TASK_UNASSIGNED,
      taskId,
      projectId: task.projectId,
      metadata: {
        assigneeId: input.assigneeId,
        assigneeName: updated.assignee?.name ?? null,
        previousAssigneeId: task.assigneeId,
      },
    });

    if (input.assigneeId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      await notifyTaskAssigned({
        assigneeId: input.assigneeId,
        workspaceId,
        taskId,
        projectId: task.projectId,
        actorId,
        taskTitle: updated.title,
        actorName: actor?.name ?? 'Alguém',
      });
    }
  }

  if (input.dueDate !== undefined) {
    const prev = task.dueDate?.toISOString() ?? null;
    const next = input.dueDate;
    if (prev !== next) {
      await logActivity({
        workspaceId,
        actorId,
        type: ActivityType.TASK_DUE_DATE_CHANGED,
        taskId,
        projectId: task.projectId,
        metadata: { from: prev, to: next },
      });
    }
  }

  if (
    input.title !== undefined &&
    input.title !== task.title &&
    input.status === undefined &&
    input.assigneeId === undefined &&
    input.dueDate === undefined
  ) {
    await logActivity({
      workspaceId,
      actorId,
      type: ActivityType.TASK_UPDATED,
      taskId,
      projectId: task.projectId,
      metadata: { field: 'title' },
    });
  }

  emitTaskEvent({
    workspaceId,
    projectId: task.projectId,
    taskId,
    action: 'updated',
  });

  return updated;
}

export async function deleteTask(
  taskId: string,
  workspaceId: string,
  actorId: string
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ...activeTaskInWorkspace(workspaceId),
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  await logActivity({
    workspaceId,
    actorId,
    type: ActivityType.TASK_DELETED,
    taskId,
    projectId: task.projectId,
    metadata: { title: task.title },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  emitTaskEvent({
    workspaceId,
    projectId: task.projectId,
    taskId,
    action: 'deleted',
  });
}

export async function getTaskWithWorkspace(taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, ...activeOnly },
    include: { project: true },
  });
}

async function validateAssignee(assigneeId: string, workspaceId: string) {
  const assignee = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId: assigneeId,
        workspaceId,
      },
    },
  });
  if (!assignee) {
    throw new AppError('Assignee is not a workspace member', 400, 'INVALID_ASSIGNEE');
  }
}
