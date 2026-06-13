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
  memberIdParamSchema,
  inviteIdParamSchema,
  updateMemberRoleSchema,
  transferOwnershipSchema,
  updateWorkspaceSchema,
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
  '/:id/overview',
  validate({ params: workspaceIdParamSchema }),
  workspaceMiddleware,
  workspaceController.getOverview
);

router.get(
  '/:id/members',
  validate({ params: workspaceIdParamSchema }),
  workspaceMiddleware,
  workspaceController.listMembers
);

router.patch(
  '/:id/members/:memberId',
  validate({ params: memberIdParamSchema, body: updateMemberRoleSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER),
  workspaceController.updateMemberRole
);

router.delete(
  '/:id/members/:memberId',
  validate({ params: memberIdParamSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  workspaceController.removeMember
);

router.get(
  '/:id/invites',
  validate({ params: workspaceIdParamSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  workspaceController.listPendingInvites
);

router.delete(
  '/:id/invites/:inviteId',
  validate({ params: inviteIdParamSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  workspaceController.revokeInvite
);

router.post(
  '/:id/transfer-ownership',
  validate({ params: workspaceIdParamSchema, body: transferOwnershipSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER),
  workspaceController.transferOwnership
);

router.patch(
  '/:id',
  validate({ params: workspaceIdParamSchema, body: updateWorkspaceSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER),
  workspaceController.updateWorkspace
);

export default router;
