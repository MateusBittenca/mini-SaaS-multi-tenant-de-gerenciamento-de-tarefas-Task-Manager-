import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const taskCommentParamsSchema = z.object({
  id: z.string().cuid(),
});

export const commentIdParamsSchema = z.object({
  id: z.string().cuid(),
  commentId: z.string().cuid(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
