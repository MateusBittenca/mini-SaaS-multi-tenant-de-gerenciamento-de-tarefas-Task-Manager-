import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateSubtaskInput, UpdateSubtaskInput } from '../schemas/subtask.schema';
import { activeTaskInWorkspace } from '../lib/soft-delete';
import { emitTaskEvent } from '../ws/realtime';

async function getTaskInWorkspace(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...activeTaskInWorkspace(workspaceId) },
    select: { id: true, projectId: true },
  });
  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }
  return task;
}

function emitSubtaskTaskUpdate(workspaceId: string, taskId: string, projectId: string) {
  emitTaskEvent({ workspaceId, projectId, taskId, action: 'updated' });
}

async function getSubtaskInWorkspace(subtaskId: string, workspaceId: string) {
  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      task: activeTaskInWorkspace(workspaceId),
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
  const task = await getTaskInWorkspace(taskId, workspaceId);

  const last = await prisma.subtask.findFirst({
    where: { taskId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: input.title,
      position: (last?.position ?? -1) + 1,
    },
  });

  emitSubtaskTaskUpdate(workspaceId, taskId, task.projectId);
  return subtask;
}

export async function updateSubtask(
  subtaskId: string,
  workspaceId: string,
  input: UpdateSubtaskInput
) {
  const subtask = await getSubtaskInWorkspace(subtaskId, workspaceId);

  const updated = await prisma.subtask.update({
    where: { id: subtaskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.completed !== undefined && { completed: input.completed }),
    },
  });

  emitSubtaskTaskUpdate(workspaceId, subtask.taskId, subtask.task.projectId);
  return updated;
}

export async function deleteSubtask(subtaskId: string, workspaceId: string) {
  const subtask = await getSubtaskInWorkspace(subtaskId, workspaceId);

  await prisma.subtask.delete({ where: { id: subtaskId } });
  emitSubtaskTaskUpdate(workspaceId, subtask.taskId, subtask.task.projectId);
}
