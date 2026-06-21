import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { fetchers } from '../../lib/fetchers';
import { queryKeys } from '../../lib/queryKeys';
import type { Role, Tag, WorkspaceMember } from '../../lib/types';

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(workspaceId!),
    queryFn: () => fetchers.members(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useTags(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tags(workspaceId!),
    queryFn: () => fetchers.tags(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function usePendingInvites(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites(workspaceId!),
    queryFn: () => fetchers.invites(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      api
        .patch<{ data: WorkspaceMember }>(`/workspaces/${workspaceId}/members/${memberId}`, {
          role,
        })
        .then((r) => r.data.data),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
      }
    },
  });
}

export function useRemoveMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
      }
    },
  });
}

export function useRevokeInvite(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invites(workspaceId) });
      }
    },
  });
}

export function useCreateTag(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api
        .post<{ data: Tag }>(`/workspaces/${workspaceId}/tags`, data)
        .then((r) => r.data.data),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspaceId) });
      }
    },
  });
}

export function useDeleteTag(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => api.delete(`/tags/${tagId}`),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tags(workspaceId) });
      }
    },
  });
}

export function useUpdateWorkspace(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api
        .patch<{ data: { id: string; name: string; slug: string } }>(
          `/workspaces/${workspaceId}`,
          { name }
        )
        .then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useTransferOwnership(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.post(`/workspaces/${workspaceId}/transfer-ownership`, { memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
      }
    },
  });
}

export function useInviteMember(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: Role }) =>
      api
        .post<{ data: { token: string; emailSent?: boolean; devInviteUrl?: string } }>(
          `/workspaces/${workspaceId}/invite`,
          data
        )
        .then((r) => r.data.data),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invites(workspaceId) });
      }
    },
  });
}
