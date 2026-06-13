import { z } from 'zod';

export const taskActivityParamsSchema = z.object({
  id: z.string().cuid(),
});

export const myTasksQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
