import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateProjectInput } from '../schemas/project.schema';

export async function listProjects(workspaceId: string) {
  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { tasks: true } },
    },
  });
}

export async function createProject(workspaceId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description,
    },
  });
}

export async function deleteProject(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  await prisma.project.delete({ where: { id: projectId } });
}

export async function getProjectInWorkspace(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  return project;
}
