import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { inviteIdParamSchema } from '../schemas/notification.schema';

const router = Router();

router.use(authMiddleware);

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
