export const queryKeys = {
  workspaces: ['workspaces'] as const,
  projects: (workspaceId: string) => ['workspaces', workspaceId, 'projects'] as const,
  project: (workspaceId: string, projectId: string) =>
    ['workspaces', workspaceId, 'projects', projectId] as const,
  tasks: (projectId: string) => ['projects', projectId, 'tasks'] as const,
  myTasks: (workspaceId: string) => ['workspaces', workspaceId, 'my-tasks'] as const,
  members: (workspaceId: string) => ['workspaces', workspaceId, 'members'] as const,
  tags: (workspaceId: string) => ['workspaces', workspaceId, 'tags'] as const,
  invites: (workspaceId: string) => ['workspaces', workspaceId, 'invites'] as const,
  overview: (workspaceId: string) => ['workspaces', workspaceId, 'overview'] as const,
  notifications: ['notifications'] as const,
  taskComments: (taskId: string) => ['tasks', taskId, 'comments'] as const,
  taskSubtasks: (taskId: string) => ['tasks', taskId, 'subtasks'] as const,
  taskActivity: (taskId: string) => ['tasks', taskId, 'activity'] as const,
  taskAttachments: (taskId: string) => ['tasks', taskId, 'attachments'] as const,
  search: (workspaceId: string, query: string) =>
    ['workspaces', workspaceId, 'search', query] as const,
};
