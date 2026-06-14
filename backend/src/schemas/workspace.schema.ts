import { z } from 'zod';
import { Role } from '@prisma/client';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
});

export const updateWorkspaceSchema = z.object({
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

export const memberIdParamSchema = z.object({
  id: z.string().cuid(),
  memberId: z.string().cuid(),
});

export const inviteIdParamSchema = z.object({
  id: z.string().cuid(),
  inviteId: z.string().cuid(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum([Role.ADMIN, Role.MEMBER]),
});

export const transferOwnershipSchema = z.object({
  memberId: z.string().cuid(),
});

export const workspaceSearchQuerySchema = z.object({
  q: z.string().min(2).max(100),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
