import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const REFRESH_DAYS = 7;

function getRefreshExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);
  return expiresAt;
}

export async function createRefreshToken(userId: string) {
  const family = randomUUID();
  const jti = randomUUID();
  const expiresAt = getRefreshExpiresAt();

  await prisma.refreshToken.create({
    data: { id: jti, userId, family, expiresAt },
  });

  return { jti, family };
}

export async function rotateRefreshToken(jti: string, userId: string, family: string) {
  const existing = await prisma.refreshToken.findUnique({ where: { id: jti } });

  if (!existing || existing.userId !== userId || existing.family !== family) {
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  }

  if (existing.revokedAt) {
    await revokeTokenFamily(family);
    throw new AppError('Refresh token reuse detected', 401, 'TOKEN_REUSE');
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError('Refresh token expired', 401, 'UNAUTHORIZED');
  }

  await prisma.refreshToken.update({
    where: { id: jti },
    data: { revokedAt: new Date() },
  });

  const newJti = randomUUID();
  const expiresAt = getRefreshExpiresAt();

  await prisma.refreshToken.create({
    data: { id: newJti, userId, family, expiresAt },
  });

  return { jti: newJti, family };
}

export async function revokeRefreshToken(jti: string) {
  await prisma.refreshToken.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeTokenFamily(family: string) {
  await prisma.refreshToken.updateMany({
    where: { family, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
