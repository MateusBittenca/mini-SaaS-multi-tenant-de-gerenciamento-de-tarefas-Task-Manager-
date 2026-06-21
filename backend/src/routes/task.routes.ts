import { Router, type NextFunction, type Request, type Response } from 'express';
import * as taskController from '../controllers/task.controller';
import * as commentController from '../controllers/comment.controller';
import * as subtaskController from '../controllers/subtask.controller';
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
import {
  createSubtaskSchema,
  updateSubtaskSchema,
  subtaskIdParamSchema,
} from '../schemas/subtask.schema';
import { myTasksQuerySchema } from '../schemas/activity.schema';
import { workspaceIdParamSchema } from '../schemas/workspace.schema';
import { paginationQuerySchema } from '../schemas/pagination.schema';
import { attachmentIdParamsSchema } from '../schemas/attachment.schema';
import { taskExportQuerySchema } from '../schemas/export.schema';
import { taskAttachmentUpload } from '../lib/upload';
import * as attachmentController from '../controllers/attachment.controller';
import * as exportController from '../controllers/export.controller';
import { mapUploadError } from '../services/attachment.service';

const router = Router();

router.use(authMiddleware);

router.get(
  '/workspaces/:id/tasks/mine',
  validate({ params: workspaceIdParamSchema, query: myTasksQuerySchema }),
  workspaceMiddleware,
  taskController.listMyTasks
);

router.get(
  '/workspaces/:id/tasks/mine/export',
  validate({ params: workspaceIdParamSchema, query: taskExportQuerySchema }),
  workspaceMiddleware,
  exportController.exportMyTasks
);

router.get(
  '/projects/:projectId/tasks',
  validate({ params: projectIdParamSchema, query: paginationQuerySchema }),
  workspaceMiddleware,
  taskController.listTasks
);

router.get(
  '/projects/:projectId/tasks/export',
  validate({ params: projectIdParamSchema, query: taskExportQuerySchema }),
  workspaceMiddleware,
  exportController.exportProjectTasks
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
  '/tasks/:id/subtasks',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  subtaskController.listSubtasks
);

router.post(
  '/tasks/:id/subtasks',
  validate({ params: taskIdParamSchema, body: createSubtaskSchema }),
  workspaceMiddleware,
  subtaskController.createSubtask
);

router.patch(
  '/subtasks/:subtaskId',
  validate({ params: subtaskIdParamSchema, body: updateSubtaskSchema }),
  workspaceMiddleware,
  subtaskController.updateSubtask
);

router.delete(
  '/subtasks/:subtaskId',
  validate({ params: subtaskIdParamSchema }),
  workspaceMiddleware,
  subtaskController.deleteSubtask
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
  validate({ params: taskIdParamSchema, query: paginationQuerySchema }),
  workspaceMiddleware,
  activityController.listTaskActivity
);

router.get(
  '/tasks/:id/attachments',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  attachmentController.listAttachments
);

router.post(
  '/tasks/:id/attachments',
  validate({ params: taskIdParamSchema }),
  workspaceMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    taskAttachmentUpload.single('file')(req, res, (err) => {
      if (err) {
        const mapped = mapUploadError(err);
        next(mapped ?? err);
        return;
      }
      next();
    });
  },
  attachmentController.uploadAttachment
);

router.get(
  '/tasks/:id/attachments/:attachmentId/download',
  validate({ params: attachmentIdParamsSchema }),
  workspaceMiddleware,
  attachmentController.downloadAttachment
);

router.delete(
  '/tasks/:id/attachments/:attachmentId',
  validate({ params: attachmentIdParamsSchema }),
  workspaceMiddleware,
  attachmentController.deleteAttachment
);

export default router;
