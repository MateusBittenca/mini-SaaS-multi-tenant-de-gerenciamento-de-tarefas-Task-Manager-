import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema';
import { PaginationQuery } from '../schemas/pagination.schema';
import { buildPaginatedResult, getPrismaPaginationArgs } from '../lib/pagination';
import { activeOnly, activeProjectInWorkspace } from '../lib/soft-delete';
import { emitProjectEvent } from '../ws/realtime';

const taskCountSelect = {
  _count: { select: { tasks: { where: activeOnly } } },
} as const;

export async function listProjects(workspaceId: string, pagination: PaginationQuery) {
  const rows = await prisma.project.findMany({
    where: activeProjectInWorkspace(workspaceId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: taskCountSelect,
    ...getPrismaPaginationArgs(pagination.cursor, pagination.limit),
  });

  return buildPaginatedResult(rows, pagination.limit);
}

export async function createProject(workspaceId: string, input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
    },
  });

  emitProjectEvent({ workspaceId, projectId: project.id, action: 'created' });
  return project;
}

export async function deleteProject(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...activeProjectInWorkspace(workspaceId) },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const deletedAt = new Date();

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId, ...activeOnly },
      data: { deletedAt },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { deletedAt },
    }),
  ]);

  emitProjectEvent({ workspaceId, projectId, action: 'deleted' });
}

export async function getProjectInWorkspace(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...activeProjectInWorkspace(workspaceId) },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return project;
}

export async function updateProject(
  projectId: string,
  workspaceId: string,
  input: UpdateProjectInput
) {
  await getProjectInWorkspace(projectId, workspaceId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });

  emitProjectEvent({ workspaceId, projectId, action: 'updated' });
  return project;
}
