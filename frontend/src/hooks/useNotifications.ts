import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type {
  AcceptInviteResponse,
  NotificationsResponse,
  PendingInviteNotification,
  Workspace,
} from '../lib/types';

const POLL_INTERVAL = 45_000;

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { workspaces, setWorkspaces } = useWorkspaceStore();
  const [invites, setInvites] = useState<PendingInviteNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setError('');
      const { data: res } = await api.get<{ data: NotificationsResponse }>('/notifications');
      setInvites(res.data.invites);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    fetchNotifications();

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, fetchNotifications]);

  const acceptInvite = async (inviteId: string): Promise<AcceptInviteResponse | null> => {
    setActionLoading(inviteId);
    setError('');
    try {
      const { data: res } = await api.post<{ data: AcceptInviteResponse }>(
        `/invites/${inviteId}/accept`
      );
      const result = res.data;

      if (!result.alreadyMember) {
        const newWorkspace: Workspace = {
          id: result.workspaceId,
          name: result.workspaceName,
          slug: result.slug ?? result.workspaceId,
          role: result.role,
          createdAt: new Date().toISOString(),
        };
        const exists = workspaces.some((w) => w.id === newWorkspace.id);
        if (!exists) {
          setWorkspaces([...workspaces, newWorkspace]);
        }
      }

      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setUnreadCount((c) => Math.max(0, c - 1));
      return result;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const declineInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError('');
    try {
      await api.post(`/invites/${inviteId}/decline`);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  return {
    invites,
    unreadCount,
    loading,
    actionLoading,
    error,
    fetchNotifications,
    acceptInvite,
    declineInvite,
    formatRelativeTime,
  };
}
