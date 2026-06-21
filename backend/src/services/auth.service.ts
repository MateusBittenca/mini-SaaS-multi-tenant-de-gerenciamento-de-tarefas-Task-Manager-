import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE,
} from '../lib/jwt';
import { sendPasswordResetEmail } from './email.service';
import {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from './refresh-token.service';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_HOURS = 1;

const GENERIC_RESET_MESSAGE =
  'Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.';

function sanitizeUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/api/auth',
  });
}

async function issueTokens(
  user: { id: string; email: string; name: string; createdAt: Date },
  res: Response
) {
  const { jti, family } = await createRefreshToken(user.id);
  const payload = { userId: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, jti, family });

  setRefreshCookie(res, refreshToken);

  return {
    user: sanitizeUser(user),
    accessToken,
  };
}

export async function registerUser(input: RegisterInput, res: Response) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
  });

  return issueTokens(user, res);
}

export async function loginUser(input: LoginInput, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  return issueTokens(user, res);
}

export async function refreshAccessToken(refreshToken: string, res: Response) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    const { jti, family } = await rotateRefreshToken(
      payload.jti,
      payload.userId,
      payload.family
    );

    const tokenPayload = { userId: user.id, email: user.email };
    const newRefreshToken = signRefreshToken({ ...tokenPayload, jti, family });
    setRefreshCookie(res, newRefreshToken);

    const accessToken = signAccessToken(tokenPayload);
    return { accessToken, user: sanitizeUser(user) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  }
}

export async function logoutUser(refreshToken: string | undefined, res: Response) {
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await revokeRefreshToken(payload.jti);
    } catch {
      // Token inválido no logout — apenas limpa o cookie
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return sanitizeUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (input.newPassword) {
    const valid = await bcrypt.compare(input.currentPassword!, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.newPassword && {
        passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS),
      }),
    },
  });

  if (input.newPassword) {
    await revokeAllUserRefreshTokens(userId);
  }

  return sanitizeUser(updated);
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: 'insensitive' } },
  });

  if (!user) {
    return { message: GENERIC_RESET_MESSAGE, emailSent: false };
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_HOURS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password/${token}`;

  const emailSent = await sendPasswordResetEmail({
    to: user.email,
    userName: user.name,
    token,
    expiresAt,
  });

  const isDev = process.env.NODE_ENV !== 'production';

  return {
    message: GENERIC_RESET_MESSAGE,
    emailSent,
    ...(isDev && !emailSent ? { devResetUrl: resetUrl } : {}),
  };
}

export async function getPasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { email: true } } },
  });

  if (!record || record.usedAt) {
    return { valid: false, expired: true };
  }

  const expired = record.expiresAt < new Date();
  return {
    valid: !expired,
    expired,
    email: maskEmail(record.user.email),
  };
}

export async function resetPassword(token: string, input: ResetPasswordInput) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  await revokeAllUserRefreshTokens(record.userId);

  return { message: 'Senha redefinida com sucesso' };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
