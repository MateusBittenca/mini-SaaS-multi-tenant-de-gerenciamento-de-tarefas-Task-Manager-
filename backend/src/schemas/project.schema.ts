import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().cuid(),
});

export const projectIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
