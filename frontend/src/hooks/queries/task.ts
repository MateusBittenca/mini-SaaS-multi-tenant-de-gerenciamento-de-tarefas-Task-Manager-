import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '../../lib/api';
import { fetchers } from '../../lib/fetchers';
import { queryKeys } from '../../lib/queryKeys';
import type { Subtask, Task, TaskComment, TaskAttachment } from '../../lib/types';

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId!),
    queryFn: () => fetchers.tasks(projectId!),
    enabled: !!projectId,
  });
}

export function useMyTasks(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myTasks(workspaceId!),
    queryFn: () => fetchers.myTasks(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.taskComments(taskId!),
    queryFn: () => fetchers.taskComments(taskId!),
    enabled: !!taskId,
  });
}

export function useTaskSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.taskSubtasks(taskId!),
    queryFn: () => fetchers.taskSubtasks(taskId!),
    enabled: !!taskId,
  });
}

export function useTaskActivity(taskId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.taskActivity(taskId!),
    queryFn: ({ pageParam }) => fetchers.taskActivityPage(taskId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!taskId,
  });
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.taskAttachments(taskId!),
    queryFn: () => fetchers.taskAttachments(taskId!),
    enabled: !!taskId,
  });
}

export function useUploadAttachment(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ data: TaskAttachment }>(
        `/tasks/${taskId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data.data;
    },
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskAttachments(taskId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(taskId) });
      }
    },
  });
}

export function useDeleteAttachment(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/tasks/${taskId}/attachments/${attachmentId}`),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskAttachments(taskId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(taskId) });
      }
    },
  });
}

export function useCreateTask(projectId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
      tagIds?: string[];
    }) =>
      api.post<{ data: Task }>(`/projects/${projectId}/tasks`, data).then((r) => r.data.data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      }
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myTasks(workspaceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.overview(workspaceId) });
      }
    },
  });
}

export function useUpdateTask(projectId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> & { tagIds?: string[] } }) =>
      api.patch<{ data: Task }>(`/tasks/${taskId}`, data).then((r) => r.data.data),
    onMutate: ({ taskId, data }) => {
      if (!projectId) return;
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks(projectId));
      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKeys.tasks(projectId),
          previous.map((t) => (t.id === taskId ? { ...t, ...data } : t))
        );
      }
      void queryClient.cancelQueries({ queryKey: queryKeys.tasks(projectId) });
      return { previous };
    },
    onSuccess: (updatedTask) => {
      if (!projectId) return;
      queryClient.setQueryData<Task[]>(queryKeys.tasks(projectId), (current) =>
        current?.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)) ?? current
      );
    },
    onError: (_err, _vars, context) => {
      if (projectId && context?.previous) {
        queryClient.setQueryData(queryKeys.tasks(projectId), context.previous);
      }
    },
    onSettled: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myTasks(workspaceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.overview(workspaceId) });
      }
    },
  });
}

export function useDeleteTask(projectId: string | undefined, workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      }
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myTasks(workspaceId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.overview(workspaceId) });
      }
    },
  });
}

export function useCreateComment(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api
        .post<{ data: TaskComment }>(`/tasks/${taskId}/comments`, { content })
        .then((r) => r.data.data),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(taskId) });
      }
    },
  });
}

export function useDeleteComment(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
      }
    },
  });
}

export function useCreateSubtask(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) =>
      api.post<{ data: Subtask }>(`/tasks/${taskId}/subtasks`, { title }).then((r) => r.data.data),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskSubtasks(taskId) });
      }
    },
  });
}

export function useUpdateSubtask(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      api.patch(`/subtasks/${subtaskId}`, { completed }),
    onMutate: async ({ subtaskId, completed }) => {
      if (!taskId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.taskSubtasks(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(queryKeys.taskSubtasks(taskId));
      if (previous) {
        queryClient.setQueryData<Subtask[]>(
          queryKeys.taskSubtasks(taskId),
          previous.map((s) => (s.id === subtaskId ? { ...s, completed } : s))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (taskId && context?.previous) {
        queryClient.setQueryData(queryKeys.taskSubtasks(taskId), context.previous);
      }
    },
    onSettled: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskSubtasks(taskId) });
      }
    },
  });
}

export function useDeleteSubtask(taskId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: string) => api.delete(`/subtasks/${subtaskId}`),
    onSuccess: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskSubtasks(taskId) });
      }
    },
  });
}

export function useWorkspaceSearch(workspaceId: string | undefined, query: string) {
  return useQuery({
    queryKey: queryKeys.search(workspaceId!, query),
    queryFn: () => fetchers.search(workspaceId!, query),
    enabled: !!workspaceId && query.trim().length >= 2,
    staleTime: 60_000,
  });
}
