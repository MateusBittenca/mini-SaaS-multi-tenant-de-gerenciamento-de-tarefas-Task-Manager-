import { z } from 'zod';

export const inviteIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().cuid(),
});
