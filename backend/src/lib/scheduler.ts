import { schedule, validate, type ScheduledTask } from 'node-cron';
import { createChildLogger } from './logger';

const schedulerLogger = createChildLogger({ component: 'scheduler' });

type JobHandler = () => Promise<void>;

interface RegisteredJob {
  name: string;
  task: ScheduledTask;
}

const jobs: RegisteredJob[] = [];

export interface ScheduleJobOptions {
  name: string;
  cron: string;
  handler: JobHandler;
  runOnInit?: boolean;
  timezone?: string;
}

export function scheduleJob(options: ScheduleJobOptions): void {
  if (!validate(options.cron)) {
    throw new Error(`Invalid cron expression for job "${options.name}": ${options.cron}`);
  }

  const timezone = options.timezone ?? process.env.SCHEDULER_TIMEZONE ?? 'America/Sao_Paulo';

  const task = schedule(
    options.cron,
    async () => {
      const startedAt = Date.now();
      try {
        await options.handler();
        schedulerLogger.debug({ job: options.name, durationMs: Date.now() - startedAt }, 'completed');
      } catch (err) {
        schedulerLogger.error(
          { job: options.name, err, durationMs: Date.now() - startedAt },
          'failed'
        );
      }
    },
    {
      name: options.name,
      timezone,
      noOverlap: true,
    }
  );

  task.on('execution:overlap', () => {
    schedulerLogger.warn({ job: options.name }, 'skipped — previous run still in progress');
  });

  jobs.push({ name: options.name, task });
  schedulerLogger.info({ job: options.name, cron: options.cron, timezone }, 'job scheduled');

  if (options.runOnInit) {
    void task.execute();
  }
}

export function stopAllJobs(): void {
  for (const { name, task } of jobs) {
    task.stop();
    schedulerLogger.info({ job: name }, 'job stopped');
  }
  jobs.length = 0;
}
