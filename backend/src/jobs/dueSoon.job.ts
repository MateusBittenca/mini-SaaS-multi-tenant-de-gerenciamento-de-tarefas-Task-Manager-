import { processDueSoonNotifications } from '../services/notification.service';

const INTERVAL_MS = 60 * 60 * 1000;

export function startDueSoonJob() {
  const run = async () => {
    try {
      const count = await processDueSoonNotifications();
      if (count > 0) {
        console.log(`[notifications] ${count} notificação(ões) de prazo criada(s)`);
      }
    } catch (err) {
      console.error('[notifications] Erro no job de prazos:', err);
    }
  };

  run();
  setInterval(run, INTERVAL_MS);
}
