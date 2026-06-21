import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { PaginationQuery } from '../schemas/pagination.schema';
import { buildPaginatedResult, getPrismaPaginationArgs } from '../lib/pagination';
import { activeTaskInWorkspace } from '../lib/soft-delete';

const actorSelect = { id: true, name: true, email: true };

export async function listTaskActivity(
  taskId: string,
  workspaceId: string,
  pagination: PaginationQuery
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...activeTaskInWorkspace(workspaceId) },
  });

  if (!task) {
    throw new AppError('Task not found', 404, 'NOT_FOUND');
  }

  const rows = await prisma.activity.findMany({
    where: { taskId, workspaceId },
    include: { actor: { select: actorSelect } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...getPrismaPaginationArgs(pagination.cursor, pagination.limit),
  });

  return buildPaginatedResult(rows, pagination.limit);
}
