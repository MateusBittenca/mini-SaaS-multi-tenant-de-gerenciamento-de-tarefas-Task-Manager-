import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app';
import { startDueSoonJob } from './jobs/dueSoon.job';
import { logger } from './lib/logger';
import { stopAllJobs } from './lib/scheduler';
import { prisma } from './lib/prisma';
import { closeRealtimeServer, initRealtimeServer } from './ws/realtime';

const app = createApp();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

initRealtimeServer(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'server started');
  startDueSoonJob();
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  stopAllJobs();
  closeRealtimeServer();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
