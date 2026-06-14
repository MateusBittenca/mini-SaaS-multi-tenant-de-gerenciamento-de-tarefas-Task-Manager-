import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { inviteIdParamSchema, notificationIdParamSchema } from '../schemas/notification.schema';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationsController.listNotifications);

router.post('/read-all', notificationsController.markAllRead);

router.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  notificationsController.markAsRead
);

router.post(
  '/:id/accept',
  validate({ params: inviteIdParamSchema }),
  notificationsController.acceptInvite
);

router.post(
  '/:id/decline',
  validate({ params: inviteIdParamSchema }),
  notificationsController.declineInvite
);

export default router;
