import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

function getWorkspaceId(req: Request): string | undefined {
  if (req.workspaceMember?.workspaceId) {
    return req.workspaceMember.workspaceId;
  }
  const header = req.headers['x-workspace-id'];
  return typeof header === 'string' ? header : undefined;
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const requestId = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
  customProps: (req) => {
    const expressReq = req as Request;
    return {
      userId: expressReq.userId,
      workspaceId: getWorkspaceId(expressReq),
    };
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});

export function logRequestError(req: Request, err: unknown, res: Response) {
  const log = req.log ?? logger;
  log.error({ err, statusCode: res.statusCode }, 'request failed');
}
