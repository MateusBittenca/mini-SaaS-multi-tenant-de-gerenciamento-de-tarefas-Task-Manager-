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

export function getRealtimeUrl(token: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  if (apiUrl.startsWith('http')) {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = `?token=${encodeURIComponent(token)}`;
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

export interface RealtimeConnection {
  close: () => void;
  setWorkspace: (workspaceId: string | null) => void;
}

export function connectRealtime(
  token: string,
  workspaceId: string | null,
  onEvent: (event: RealtimeEvent) => void
): RealtimeConnection {
  let socket: WebSocket | null = null;
  let closed = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let subscribedWorkspace: string | null = workspaceId;

  const subscribe = (id: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'subscribe', workspaceId: id }));
    }
  };

  const unsubscribe = (id: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'unsubscribe', workspaceId: id }));
    }
  };

  const connect = () => {
    if (closed) return;

    socket = new WebSocket(getRealtimeUrl(token));

    socket.onopen = () => {
      reconnectAttempt = 0;
      if (subscribedWorkspace) {
        subscribe(subscribedWorkspace);
      }
    };

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as RealtimeEvent | { type: 'connected' };
        if (event.type === 'connected') return;
        onEvent(event);
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => {
      socket = null;
      if (closed) return;

      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (subscribedWorkspace) {
        unsubscribe(subscribedWorkspace);
      }
      socket?.close();
    },
    setWorkspace: (nextWorkspaceId) => {
      if (subscribedWorkspace && subscribedWorkspace !== nextWorkspaceId) {
        unsubscribe(subscribedWorkspace);
      }
      subscribedWorkspace = nextWorkspaceId;
      if (nextWorkspaceId) {
        subscribe(nextWorkspaceId);
      }
    },
  };
}
