import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateSubtaskInput, UpdateSubtaskInput } from '../schemas/subtask.schema';

async function getTaskInWorkspace(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
  });
  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }
  return task;
}

async function getSubtaskInWorkspace(subtaskId: string, workspaceId: string) {
  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      task: { project: { workspaceId } },
    },
    include: { task: true },
  });
  if (!subtask) {
    throw new AppError('Subtask not found', 404, 'NOT_FOUND');
  }
  return subtask;
}

export async function listSubtasks(taskId: string, workspaceId: string) {
  await getTaskInWorkspace(taskId, workspaceId);

  return prisma.subtask.findMany({
    where: { taskId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createSubtask(
  taskId: string,
  workspaceId: string,
  input: CreateSubtaskInput
) {
  await getTaskInWorkspace(taskId, workspaceId);

  const last = await prisma.subtask.findFirst({
    where: { taskId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  return prisma.subtask.create({
    data: {
      taskId,
      title: input.title,
      position: (last?.position ?? -1) + 1,
    },
  });
}

export async function updateSubtask(
  subtaskId: string,
  workspaceId: string,
  input: UpdateSubtaskInput
) {
  await getSubtaskInWorkspace(subtaskId, workspaceId);

  return prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.completed !== undefined && { completed: input.completed }),
    },
  });
}

export async function deleteSubtask(subtaskId: string, workspaceId: string) {
  await getSubtaskInWorkspace(subtaskId, workspaceId);

  await prisma.subtask.delete({ where: { id: subtaskId } });
}
