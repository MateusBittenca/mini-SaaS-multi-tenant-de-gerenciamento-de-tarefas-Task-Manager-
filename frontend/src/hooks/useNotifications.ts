import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getErrorMessage } from '../lib/api';
import { fetchers } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { AcceptInviteResponse, Workspace } from '../lib/types';

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
  const queryClient = useQueryClient();
  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchers.notifications,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      api
        .post<{ data: AcceptInviteResponse }>(`/invites/${inviteId}/accept`)
        .then((r) => r.data.data),
    onSuccess: (result) => {
      if (!result.alreadyMember) {
        const newWorkspace: Workspace = {
          id: result.workspaceId,
          name: result.workspaceName,
          slug: result.slug ?? result.workspaceId,
          role: result.role,
          createdAt: new Date().toISOString(),
        };
        if (!workspaces.some((w) => w.id === newWorkspace.id)) {
          setWorkspaces([...workspaces, newWorkspace]);
        }
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => api.post(`/invites/${inviteId}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });

  const data = query.data;

  return {
    invites: data?.invites ?? [],
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    loading: query.isLoading,
    actionLoading:
      acceptInviteMutation.isPending
        ? acceptInviteMutation.variables
        : declineInviteMutation.isPending
          ? declineInviteMutation.variables
          : null,
    error: query.error ? getErrorMessage(query.error) : '',
    fetchNotifications: query.refetch,
    acceptInvite: async (inviteId: string) => {
      try {
        return await acceptInviteMutation.mutateAsync(inviteId);
      } catch {
        return null;
      }
    },
    declineInvite: declineInviteMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    formatRelativeTime,
  };
}
