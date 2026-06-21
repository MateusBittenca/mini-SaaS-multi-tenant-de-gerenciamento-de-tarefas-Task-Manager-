import { z } from 'zod';
import { paginationQuerySchema } from './pagination.schema';

export const taskActivityParamsSchema = z.object({
  id: z.string().cuid(),
});

export const myTasksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
