import pino from 'pino';

const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(!isProduction && !isTest
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
});

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
