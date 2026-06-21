import type { Logger } from 'pino';
import type { WorkspaceMemberContext } from './request-context';

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      userId?: string;
      userEmail?: string;
      workspaceMember?: WorkspaceMemberContext;
    }
  }
}

export {};
