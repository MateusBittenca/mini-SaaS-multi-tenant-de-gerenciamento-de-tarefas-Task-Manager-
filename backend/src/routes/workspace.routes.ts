import { Router } from 'express';
import * as workspaceController from '../controllers/workspace.controller';
import { authMiddleware } from '../middlewares/auth';
import { workspaceMiddleware, requireRole } from '../middlewares/workspace';
import { validate } from '../middlewares/validate';
import {
  createWorkspaceSchema,
  inviteMemberSchema,
  workspaceIdParamSchema,
  inviteTokenParamSchema,
} from '../schemas/workspace.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', workspaceController.listWorkspaces);
router.post('/', validate({ body: createWorkspaceSchema }), workspaceController.createWorkspace);

router.get(
  '/invites/:token',
  validate({ params: inviteTokenParamSchema }),
  workspaceController.getInvite
);

router.post(
  '/invites/:token/accept',
  validate({ params: inviteTokenParamSchema }),
  workspaceController.acceptInvite
);

router.post(
  '/:id/invite',
  validate({ params: workspaceIdParamSchema, body: inviteMemberSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  workspaceController.inviteMember
);

router.get(
  '/:id/members',
  validate({ params: workspaceIdParamSchema }),
  workspaceMiddleware,
  workspaceController.listMembers
);

export default router;
