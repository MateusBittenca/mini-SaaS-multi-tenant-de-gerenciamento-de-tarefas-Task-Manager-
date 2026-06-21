import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const taskExportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']),
  search: z.string().max(200).optional(),
  assigneeId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  tagId: z.string().cuid().optional(),
});

export type TaskExportQuery = z.infer<typeof taskExportQuerySchema>;
