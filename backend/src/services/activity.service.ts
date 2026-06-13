import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const actorSelect = { id: true, name: true, email: true };

export async function listTaskActivity(taskId: string, workspaceId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId } },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  return prisma.activity.findMany({
    where: { taskId, workspaceId },
    include: { actor: { select: actorSelect } },
    orderBy: { createdAt: 'desc' },
  });
}
