import request from 'supertest';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { signAccessToken } from '../lib/jwt';

export const app = createApp();

export async function createUser(email: string, name: string, password = 'password123') {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, name, passwordHash },
  });
}

export async function createWorkspaceWithOwner(userId: string, name = 'Test Workspace') {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      members: { create: { userId, role: Role.OWNER } },
    },
  });
  return workspace;
}

export async function addMember(workspaceId: string, userId: string, role: Role = Role.MEMBER) {
  return prisma.workspaceMember.create({
    data: { workspaceId, userId, role },
  });
}

export function authHeader(userId: string, email: string) {
  const token = signAccessToken({ userId, email });
  return { Authorization: `Bearer ${token}` };
}

export function workspaceHeader(workspaceId: string) {
  return { 'X-Workspace-Id': workspaceId };
}

export { request };
