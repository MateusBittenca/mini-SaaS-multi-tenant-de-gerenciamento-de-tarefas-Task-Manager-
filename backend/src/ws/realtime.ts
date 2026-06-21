import { IncomingMessage, Server } from 'http';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { createChildLogger } from '../lib/logger';
import type {
  ClientMessage,
  CommentRealtimeEvent,
  NotificationRealtimeEvent,
  ProjectRealtimeEvent,
  RealtimeEvent,
  TaskRealtimeEvent,
} from './types';

interface ClientState {
  userId: string;
  workspaces: Set<string>;
}

const wsLogger = createChildLogger({ component: 'realtime' });

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ClientState>();

function getTokenFromRequest(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? '', 'http://localhost');
  return url.searchParams.get('token');
}

function send(socket: WebSocket, event: RealtimeEvent | { type: 'connected' }) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

async function handleClientMessage(socket: WebSocket, state: ClientState, raw: string) {
  let message: ClientMessage;
  try {
    message = JSON.parse(raw) as ClientMessage;
  } catch {
    return;
  }

  if (!message.workspaceId || !['subscribe', 'unsubscribe'].includes(message.action)) {
    return;
  }

  if (message.action === 'unsubscribe') {
    state.workspaces.delete(message.workspaceId);
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: state.userId, workspaceId: message.workspaceId },
    },
    select: { id: true },
  });

  if (!membership) {
    return;
  }

  state.workspaces.add(message.workspaceId);
}

export function initRealtimeServer(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, req) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      socket.close(4401, 'Unauthorized');
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      socket.close(4401, 'Unauthorized');
      return;
    }

    const state: ClientState = { userId: payload.userId, workspaces: new Set() };
    clients.set(socket, state);
    wsLogger.debug({ userId: payload.userId }, 'client connected');

    send(socket, { type: 'connected' });

    socket.on('message', (raw: RawData) => {
      const data = typeof raw === 'string' ? raw : Buffer.from(raw as Buffer).toString();
      void handleClientMessage(socket, state, data);
    });

    socket.on('close', () => {
      clients.delete(socket);
      wsLogger.debug({ userId: state.userId }, 'client disconnected');
    });

    socket.on('error', (err) => {
      wsLogger.warn({ userId: state.userId, err }, 'client error');
    });
  });

  wsLogger.info('realtime server started on /ws');
}

function broadcastToWorkspace(workspaceId: string, event: RealtimeEvent) {
  for (const [socket, state] of clients) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    if (!state.workspaces.has(workspaceId)) continue;
    send(socket, event);
  }
}

function notifyUser(userId: string, event: RealtimeEvent) {
  for (const [socket, state] of clients) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    if (state.userId !== userId) continue;
    send(socket, event);
  }
}

export function emitNotification(userId: string) {
  const event: NotificationRealtimeEvent = { type: 'notification' };
  notifyUser(userId, event);
}

export function emitTaskEvent(event: Omit<TaskRealtimeEvent, 'type'>) {
  broadcastToWorkspace(event.workspaceId, { type: 'task', ...event });
}

export function emitCommentEvent(event: Omit<CommentRealtimeEvent, 'type'>) {
  broadcastToWorkspace(event.workspaceId, { type: 'comment', ...event });
}

export function emitProjectEvent(event: Omit<ProjectRealtimeEvent, 'type'>) {
  broadcastToWorkspace(event.workspaceId, { type: 'project', ...event });
}

export function closeRealtimeServer() {
  for (const socket of clients.keys()) {
    socket.close();
  }
  clients.clear();
  wss?.close();
  wss = null;
}
