import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { CreateTagInput } from '../schemas/tag.schema';

export async function listTags(workspaceId: string) {
  return prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
}

export async function createTag(workspaceId: string, input: CreateTagInput) {
  const existing = await prisma.tag.findUnique({
    where: {
      workspaceId_name: { workspaceId, name: input.name },
    },
  });

  if (existing) {
    throw new AppError('Tag name already exists in this workspace', 409, 'DUPLICATE_TAG');
  }

  return prisma.tag.create({
    data: {
      workspaceId,
      name: input.name,
      color: input.color,
    },
  });
}

export async function deleteTag(tagId: string, workspaceId: string) {
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, workspaceId },
  });

  if (!tag) {
    throw new AppError('Tag not found', 404, 'NOT_FOUND');
  }

  await prisma.tag.delete({ where: { id: tagId } });
}

export async function validateTagIds(tagIds: string[], workspaceId: string) {
  if (tagIds.length === 0) return;

  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds }, workspaceId },
    select: { id: true },
  });

  if (tags.length !== tagIds.length) {
    throw new AppError('One or more tags are invalid for this workspace', 400, 'INVALID_TAGS');
  }
}
