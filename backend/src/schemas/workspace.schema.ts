import { z } from 'zod';
import { Role } from '@prisma/client';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([Role.ADMIN, Role.MEMBER]).default(Role.MEMBER),
});

export const workspaceIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const inviteTokenParamSchema = z.object({
  token: z.string().uuid(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
