import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authMiddleware } from '../middlewares/auth';
import { workspaceMiddleware } from '../middlewares/workspace';
import { validate } from '../middlewares/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  projectIdParamSchema,
  taskIdParamSchema,
} from '../schemas/task.schema';

const router = Router();

router.use(authMiddleware);

router.get(
  '/projects/:projectId/tasks',
  validate({ params: projectIdParamSchema }),
  workspaceMiddleware,
  taskController.listTasks
);

router.post(
  '/projects/:projectId/tasks',
  validate({ params: projectIdParamSchema, body: createTaskSchema }),
  workspaceMiddleware,
  taskController.createTask
);

router.patch(
  '/tasks/:id',
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  workspaceMiddleware,
  taskController.updateTask
);

router.delete(
  '/tasks/:id',
  validate({ params: taskIdParamSchema }),
  taskController.deleteTask
);

export default router;
