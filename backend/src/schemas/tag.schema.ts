import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hexadecimal (#RRGGBB)');

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: hexColorSchema,
});

export const workspaceIdTagsParamSchema = z.object({
  workspaceId: z.string().cuid(),
});

export const tagIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
