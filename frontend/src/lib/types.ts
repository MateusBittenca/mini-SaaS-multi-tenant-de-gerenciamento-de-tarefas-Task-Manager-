export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: Role;
  joinedAt?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { tasks: number };
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskAssignee | null;
  project?: { id: string; name: string };
  subtasks?: { completed: boolean }[];
  tags?: Tag[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: TaskAssignee;
}

export type ActivityType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_DUE_DATE_CHANGED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_DELETED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_DELETED';

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string; email: string };
}

export interface TaskActivity {
  id: string;
  workspaceId: string;
  taskId: string | null;
  projectId: string | null;
  actorId: string;
  type: ActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: TaskAssignee;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface PendingWorkspaceInvite {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  invitedBy: { name: string; email: string } | null;
}

export interface InvitePreview {
  email: string;
  role: Role;
  accepted: boolean;
  declined?: boolean;
  expired: boolean;
  workspaceName: string;
  workspaceId: string;
}

export interface PendingInviteNotification {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
  invitedBy: { name: string; email: string } | null;
  createdAt: string;
  expiresAt: string;
}

export interface NotificationsResponse {
  unreadCount: number;
  invites: PendingInviteNotification[];
  notifications: AppNotification[];
}

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_COMMENTED' | 'TASK_DUE_SOON';

export interface AppNotification {
  id: string;
  type: NotificationType;
  read: boolean;
  workspaceId: string;
  taskId: string | null;
  projectId: string | null;
  actorId: string | null;
  actorName: string | null;
  workspaceName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceSearchResult {
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    projectId: string;
    projectName: string;
    assignee: { id: string; name: string } | null;
  }[];
  projects: {
    id: string;
    name: string;
    description: string | null;
  }[];
}

export interface AcceptInviteResponse {
  workspaceId: string;
  workspaceName: string;
  role: Role;
  slug?: string;
  alreadyMember: boolean;
}

export interface ApiResponse<T> {
  data: T;
}

export interface WorkspaceOverview {
  totalTasks: number;
  totalProjects: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByMember: { userId: string; name: string; count: number }[];
  topProjects: { id: string; name: string; taskCount: number }[];
  dueSoon: {
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: string;
    project: { id: string; name: string };
    assignee: { id: string; name: string } | null;
  }[];
}

export interface ApiError {
  error: {
    message: string;
    code: string;
  };
}
