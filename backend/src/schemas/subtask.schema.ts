import { z } from 'zod';

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const subtaskIdParamSchema = z.object({
  subtaskId: z.string().cuid(),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
