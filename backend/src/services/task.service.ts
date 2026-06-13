import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateTaskInput, UpdateTaskInput } from '../schemas/task.schema';

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
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createTask(
  projectId: string,
  workspaceId: string,
  input: CreateTaskInput
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  if (input.assigneeId) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: input.assigneeId,
          workspaceId,
        },
      },
    });
    if (!assignee) {
      throw new AppError('Assignee is not a workspace member', 400, 'INVALID_ASSIGNEE');
    }
  }

  return prisma.task.create({
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
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  input: UpdateTaskInput
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

  if (input.assigneeId) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: input.assigneeId,
          workspaceId,
        },
      },
    });
    if (!assignee) {
      throw new AppError('Assignee is not a workspace member', 400, 'INVALID_ASSIGNEE');
    }
  }

  return prisma.task.update({
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
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function deleteTask(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: { workspaceId },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  await prisma.task.delete({ where: { id: taskId } });
}

export async function getTaskWithWorkspace(taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId },
    include: { project: true },
  });
}
