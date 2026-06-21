import { z } from 'zod';

export const attachmentIdParamsSchema = z.object({
  id: z.string().cuid(),
  attachmentId: z.string().cuid(),
});
