import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '../../lib/api';
import { fetchers } from '../../lib/fetchers';
import { queryKeys } from '../../lib/queryKeys';
import type { Project, Workspace } from '../../lib/types';

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: fetchers.workspaces,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ data: Workspace }>('/workspaces', { name }).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useProjects(workspaceId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.projects(workspaceId!),
    queryFn: ({ pageParam }) => fetchers.projectsPage(workspaceId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!workspaceId,
  });
}

export function useProject(workspaceId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(workspaceId!, projectId!),
    queryFn: () => fetchers.project(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
  });
}

export function useCreateProject(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api
        .post<{ data: Project }>(`/workspaces/${workspaceId}/projects`, data)
        .then((r) => r.data.data),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.overview(workspaceId) });
      }
    },
  });
}

export function useDeleteProject(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.overview(workspaceId) });
      }
    },
  });
}

export function useUpdateProject(workspaceId: string | undefined, projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api
        .patch<{ data: Project }>(`/projects/${projectId}`, data)
        .then((r) => r.data.data),
    onSuccess: (project) => {
      if (workspaceId && projectId) {
        queryClient.setQueryData(queryKeys.project(workspaceId, projectId), project);
        queryClient.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
      }
    },
  });
}

export function useOverview(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.overview(workspaceId!),
    queryFn: () => fetchers.overview(workspaceId!),
    enabled: !!workspaceId,
  });
}
