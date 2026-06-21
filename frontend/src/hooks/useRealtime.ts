import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { connectRealtime, type RealtimeEvent } from '../lib/realtime';
import { queryKeys } from '../lib/queryKeys';
import api from '../lib/api';
import type { Task } from '../lib/types';

async function patchTaskInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  taskId: string,
  action: 'created' | 'updated' | 'deleted'
) {
  if (action === 'deleted') {
    queryClient.setQueryData<Task[]>(queryKeys.tasks(projectId), (current) =>
      current?.filter((task) => task.id !== taskId)
    );
    return;
  }

  const { data: res } = await api.get<{ data: Task }>(`/tasks/${taskId}`);
  const updated = res.data;

  queryClient.setQueryData<Task[]>(queryKeys.tasks(projectId), (current) => {
    if (!current) return current;
    const exists = current.some((task) => task.id === taskId);
    if (action === 'created' && !exists) return [...current, updated];
    return current.map((task) => (task.id === taskId ? { ...task, ...updated } : task));
  });
}

export function useRealtime() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { workspaceId: routeWorkspaceId } = useParams<{ workspaceId?: string }>();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = routeWorkspaceId ?? activeWorkspaceId ?? null;
  const connectionRef = useRef<ReturnType<typeof connectRealtime> | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const handleEvent = (event: RealtimeEvent) => {
      switch (event.type) {
        case 'notification':
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
          break;
        case 'task':
          void patchTaskInCache(
            queryClient,
            event.projectId,
            event.taskId,
            event.action
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.myTasks(event.workspaceId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.overview(event.workspaceId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.taskSubtasks(event.taskId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.taskAttachments(event.taskId) });
          break;
        case 'comment':
          queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(event.taskId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(event.taskId) });
          break;
        case 'project':
          queryClient.invalidateQueries({ queryKey: queryKeys.projects(event.workspaceId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.overview(event.workspaceId) });
          break;
      }
    };

    connectionRef.current = connectRealtime(accessToken, workspaceId, handleEvent);

    return () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    };
  }, [accessToken, queryClient]);

  useEffect(() => {
    connectionRef.current?.setWorkspace(workspaceId);
  }, [workspaceId]);
}
