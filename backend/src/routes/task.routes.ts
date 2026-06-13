import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import * as commentController from '../controllers/comment.controller';
import * as activityController from '../controllers/activity.controller';
import { authMiddleware } from '../middlewares/auth';
import { workspaceMiddleware } from '../middlewares/workspace';
import { validate } from '../middlewares/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  projectIdParamSchema,
  taskIdParamSchema,
} from '../schemas/task.schema';
import { createCommentSchema, commentIdParamsSchema } from '../schemas/comment.schema';
import { myTasksQuerySchema } from '../schemas/activity.schema';
import { workspaceIdParamSchema } from '../schemas/workspace.schema';

const router = Router();

router.use(authMiddleware);

router.get(
  '/workspaces/:id/tasks/mine',
  validate({ params: workspaceIdParamSchema, query: myTasksQuerySchema }),
  workspaceMiddleware,
  taskController.listMyTasks
);

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

router.get(
  '/tasks/:id',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  taskController.getTask
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

router.get(
  '/tasks/:id/comments',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  commentController.listComments
);

router.post(
  '/tasks/:id/comments',
  validate({ params: taskIdParamSchema, body: createCommentSchema }),
  workspaceMiddleware,
  commentController.createComment
);

router.delete(
  '/tasks/:id/comments/:commentId',
  validate({ params: commentIdParamsSchema }),
  workspaceMiddleware,
  commentController.deleteComment
);

router.get(
  '/tasks/:id/activity',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  activityController.listTaskActivity
);

export default router;
