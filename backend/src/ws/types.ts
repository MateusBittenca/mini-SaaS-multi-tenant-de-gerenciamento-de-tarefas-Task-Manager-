export type TaskRealtimeAction = 'created' | 'updated' | 'deleted';
export type CommentRealtimeAction = 'created' | 'deleted';
export type ProjectRealtimeAction = 'created' | 'updated' | 'deleted';

export interface NotificationRealtimeEvent {
  type: 'notification';
}

export interface TaskRealtimeEvent {
  type: 'task';
  workspaceId: string;
  projectId: string;
  taskId: string;
  action: TaskRealtimeAction;
}

export interface CommentRealtimeEvent {
  type: 'comment';
  workspaceId: string;
  taskId: string;
  action: CommentRealtimeAction;
}

export interface ProjectRealtimeEvent {
  type: 'project';
  workspaceId: string;
  projectId: string;
  action: ProjectRealtimeAction;
}

export type RealtimeEvent =
  | NotificationRealtimeEvent
  | TaskRealtimeEvent
  | CommentRealtimeEvent
  | ProjectRealtimeEvent;

export interface ClientMessage {
  action: 'subscribe' | 'unsubscribe';
  workspaceId: string;
}
