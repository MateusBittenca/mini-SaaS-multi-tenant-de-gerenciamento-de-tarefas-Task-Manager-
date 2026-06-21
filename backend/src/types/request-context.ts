import { Role } from '@prisma/client';

export interface WorkspaceMemberContext {
  id: string;
  userId: string;
  workspaceId: string;
  role: Role;
}
