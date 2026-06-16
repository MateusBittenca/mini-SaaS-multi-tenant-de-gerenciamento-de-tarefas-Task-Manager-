import { Router } from 'express';
import * as tagController from '../controllers/tag.controller';
import { authMiddleware } from '../middlewares/auth';
import { workspaceMiddleware, requireRole } from '../middlewares/workspace';
import { validate } from '../middlewares/validate';
import {
  createTagSchema,
  workspaceIdTagsParamSchema,
  tagIdParamSchema,
} from '../schemas/tag.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get(
  '/workspaces/:workspaceId/tags',
  validate({ params: workspaceIdTagsParamSchema }),
  workspaceMiddleware,
  tagController.listTags
);

router.post(
  '/workspaces/:workspaceId/tags',
  validate({ params: workspaceIdTagsParamSchema, body: createTagSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  tagController.createTag
);

router.delete(
  '/tags/:id',
  validate({ params: tagIdParamSchema }),
  workspaceMiddleware,
  requireRole(Role.OWNER, Role.ADMIN),
  tagController.deleteTag
);

export default router;
