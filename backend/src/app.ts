import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import notificationsRoutes from './routes/notifications.routes';
import inviteRoutes from './routes/invite.routes';
import { isAppError } from './lib/errors';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api', projectRoutes);
  app.use('/api', taskRoutes);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (isAppError(err)) {
        res.status(err.statusCode).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }

      console.error(err);
      res.status(500).json({
        error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
      });
    }
  );

  return app;
}
