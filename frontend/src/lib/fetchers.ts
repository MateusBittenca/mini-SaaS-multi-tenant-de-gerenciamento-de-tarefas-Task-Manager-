import api from './api';
import { fetchAllPages, fetchPage } from './pagination';
import type {
  NotificationsResponse,
  PendingWorkspaceInvite,
  Project,
  Subtask,
  Tag,
  Task,
  TaskActivity,
  TaskComment,
  TaskAttachment,
  Workspace,
  WorkspaceMember,
  WorkspaceOverview,
  WorkspaceSearchResult,
} from './types';

async function getData<T>(path: string, params?: Record<string, string | number | boolean>) {
  const { data: res } = await api.get<{ data: T }>(path, { params });
  return res.data;
}

export const fetchers = {
  workspaces: () => getData<Workspace[]>('/workspaces'),

  projectsPage: (workspaceId: string, cursor?: string) =>
    fetchPage<Project>(`/workspaces/${workspaceId}/projects`, { cursor }),

  project: (workspaceId: string, projectId: string) =>
    getData<Project>(`/workspaces/${workspaceId}/projects/${projectId}`),

  tasks: (projectId: string) => fetchAllPages<Task>(`/projects/${projectId}/tasks`),

  myTasks: (workspaceId: string) =>
    fetchAllPages<Task>(`/workspaces/${workspaceId}/tasks/mine`),

  members: (workspaceId: string) =>
    fetchAllPages<WorkspaceMember>(`/workspaces/${workspaceId}/members`),

  tags: (workspaceId: string) => getData<Tag[]>(`/workspaces/${workspaceId}/tags`),

  invites: (workspaceId: string) =>
    getData<PendingWorkspaceInvite[]>(`/workspaces/${workspaceId}/invites`),

  overview: (workspaceId: string) =>
    getData<WorkspaceOverview>(`/workspaces/${workspaceId}/overview`),

  notifications: () => getData<NotificationsResponse>('/notifications'),

  taskComments: (taskId: string) => getData<TaskComment[]>(`/tasks/${taskId}/comments`),

  taskSubtasks: (taskId: string) => getData<Subtask[]>(`/tasks/${taskId}/subtasks`),

  taskAttachments: (taskId: string) => getData<TaskAttachment[]>(`/tasks/${taskId}/attachments`),

  taskActivityPage: (taskId: string, cursor?: string) =>
    fetchPage<TaskActivity>(`/tasks/${taskId}/activity`, { cursor, limit: 20 }),

  search: (workspaceId: string, query: string) =>
    getData<WorkspaceSearchResult>(`/workspaces/${workspaceId}/search`, { q: query }),
};
