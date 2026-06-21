import { createChildLogger } from '../lib/logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Task Manager <onboarding@resend.dev>';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const emailLogger = createChildLogger({ service: 'email' });

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

function formatExpiresAt(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function buildInviteEmailHtml(params: {
  workspaceName: string;
  invitedByName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}): string {
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #2C2420; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">Você foi convidado!</h1>
  <p><strong>${params.invitedByName}</strong> convidou você para participar do workspace <strong>${params.workspaceName}</strong> como <strong>${roleLabel}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${params.acceptUrl}" style="display: inline-block; background: #C4704B; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Aceitar convite</a>
  </p>
  <p style="font-size: 13px; color: #6B5E54;">Este convite expira em ${formatExpiresAt(params.expiresAt)}.</p>
  <p style="font-size: 12px; color: #9A8E84; margin-top: 32px;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${params.acceptUrl}">${params.acceptUrl}</a></p>
</body>
</html>`;
}

export async function sendInviteEmail(params: {
  to: string;
  workspaceName: string;
  invitedByName: string;
  role: string;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  const acceptUrl = `${FRONTEND_URL}/invites/${params.token}`;

  return sendEmail({
    to: params.to,
    subject: `Convite para ${params.workspaceName}`,
    html: buildInviteEmailHtml({
      workspaceName: params.workspaceName,
      invitedByName: params.invitedByName,
      role: params.role,
      acceptUrl,
      expiresAt: params.expiresAt,
    }),
    logLabel: 'convite',
    logLink: acceptUrl,
  });
}

function buildPasswordResetEmailHtml(params: {
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #2C2420; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">Redefinir senha</h1>
  <p>Olá, <strong>${params.userName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta no Task Manager.</p>
  <p style="margin: 24px 0;">
    <a href="${params.resetUrl}" style="display: inline-block; background: #C4704B; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Redefinir senha</a>
  </p>
  <p style="font-size: 13px; color: #6B5E54;">Este link expira em ${formatExpiresAt(params.expiresAt)}.</p>
  <p style="font-size: 13px; color: #6B5E54;">Se você não solicitou isso, ignore este e-mail.</p>
  <p style="font-size: 12px; color: #9A8E84; margin-top: 32px;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${params.resetUrl}">${params.resetUrl}</a></p>
</body>
</html>`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  logLabel: string;
  logLink?: string;
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    emailLogger.warn(
      { to: params.to, logLabel: params.logLabel, logLink: params.logLink },
      'RESEND_API_KEY not configured'
    );
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      emailLogger.error(
        {
          status: response.status,
          body,
          to: params.to,
          logLabel: params.logLabel,
          logLink: params.logLink,
        },
        'email send failed'
      );
      return false;
    }

    emailLogger.info({ to: params.to, logLabel: params.logLabel }, 'email sent');
    return true;
  } catch (err) {
    emailLogger.error({ err, to: params.to, logLabel: params.logLabel }, 'email send error');
    return false;
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL}/reset-password/${params.token}`;
  return sendEmail({
    to: params.to,
    subject: 'Redefinir sua senha — Task Manager',
    html: buildPasswordResetEmailHtml({
      userName: params.userName,
      resetUrl,
      expiresAt: params.expiresAt,
    }),
    logLabel: 'recuperação de senha',
    logLink: resetUrl,
  });
}
