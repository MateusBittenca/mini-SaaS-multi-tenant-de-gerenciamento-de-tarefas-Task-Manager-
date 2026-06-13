import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth';
import { workspaceMiddleware, requireMinRole } from '../middlewares/workspace';
import { validate } from '../middlewares/validate';
import { Role } from '@prisma/client';
import {
  createProjectSchema,
  updateProjectSchema,
  workspaceIdParamSchema,
  projectIdParamSchema,
} from '../schemas/project.schema';
import { z } from 'zod';

const router = Router();

const workspaceProjectParamsSchema = workspaceIdParamSchema.extend({
  projectId: z.string().cuid(),
});

router.use(authMiddleware);

router.get(
  '/workspaces/:workspaceId/projects',
  validate({ params: workspaceIdParamSchema }),
  workspaceMiddleware,
  projectController.listProjects
);

router.post(
  '/workspaces/:workspaceId/projects',
  validate({ params: workspaceIdParamSchema, body: createProjectSchema }),
  workspaceMiddleware,
  projectController.createProject
);

router.get(
  '/workspaces/:workspaceId/projects/:projectId',
  validate({ params: workspaceProjectParamsSchema }),
  workspaceMiddleware,
  projectController.getProject
);

router.patch(
  '/projects/:id',
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  workspaceMiddleware,
  requireMinRole(Role.ADMIN),
  projectController.updateProject
);

router.delete(
  '/projects/:id',
  validate({ params: projectIdParamSchema }),
  projectController.deleteProject
);

export default router;
