import { ActivityType } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { logActivity } from '../lib/activity';
import { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema';

const actorSelect = { id: true, name: true, email: true };

export async function listTasks(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: actorSelect },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listMyTasks(
  workspaceId: string,
  userId: string,
  filters?: { status?: string; overdue?: boolean }
) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return prisma.task.findMany({
    where: {
      assigneeId: userId,
      project: { workspaceId },
      ...(filters?.status && { status: filters.status as TaskStatus }),
      ...(filters?.overdue && {
        dueDate: { lt: now },
        NOT: { status: TaskStatus.DONE },
      }),
    },
    include: {
      assignee: { select: actorSelect },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function getTask(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: { workspaceId },
    },
    include: {
      assignee: { select: actorSelect },
    },
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
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  if (input.assigneeId) {
    await validateAssignee(input.assigneeId, workspaceId);
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
    },
    include: {
      assignee: { select: actorSelect },
    },
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
  }

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
      project: { workspaceId },
    },
    include: { assignee: { select: actorSelect } },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  if (input.assigneeId) {
    await validateAssignee(input.assigneeId, workspaceId);
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
    },
    include: {
      assignee: { select: actorSelect },
    },
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
      project: { workspaceId },
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

  await prisma.task.delete({ where: { id: taskId } });
}

export async function getTaskWithWorkspace(taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId },
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
