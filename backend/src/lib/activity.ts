import { ActivityType, Prisma } from '@prisma/client';
import { prisma } from './prisma';

interface LogActivityInput {
  workspaceId: string;
  actorId: string;
  type: ActivityType;
  taskId?: string;
  projectId?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logActivity(input: LogActivityInput) {
  return prisma.activity.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      type: input.type,
      taskId: input.taskId,
      projectId: input.projectId,
      metadata: input.metadata,
    },
  });
}
