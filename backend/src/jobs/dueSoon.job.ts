import { scheduleJob } from '../lib/scheduler';
import { createChildLogger } from '../lib/logger';
import { processDueSoonNotifications } from '../services/notification.service';

const jobLogger = createChildLogger({ job: 'dueSoon' });
const DUE_SOON_CRON = process.env.DUE_SOON_CRON ?? '0 * * * *';

export function startDueSoonJob() {
  scheduleJob({
    name: 'dueSoon',
    cron: DUE_SOON_CRON,
    runOnInit: true,
    handler: async () => {
      const count = await processDueSoonNotifications();
      if (count > 0) {
        jobLogger.info({ count }, 'due soon notifications created');
      }
    },
  });
}
