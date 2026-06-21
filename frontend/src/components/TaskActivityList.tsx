import { Circle, Loader, MessageSquare, UserPlus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { formatActivityMessage } from '../lib/activityLabels';
import { formatRelativeTime } from '../lib/dates';
import { useTaskActivity } from '../hooks/queries/task';
import type { ActivityType, TaskActivity } from '../lib/types';
import { Button } from './Button';

const iconByType: Partial<Record<ActivityType, typeof Circle>> = {
  TASK_CREATED: Pencil,
  TASK_UPDATED: Pencil,
  TASK_STATUS_CHANGED: Loader,
  TASK_ASSIGNED: UserPlus,
  TASK_UNASSIGNED: UserPlus,
  TASK_DUE_DATE_CHANGED: Calendar,
  TASK_DELETED: Trash2,
  COMMENT_ADDED: MessageSquare,
  COMMENT_DELETED: MessageSquare,
};

interface TaskActivityListProps {
  taskId: string;
}

export function TaskActivityList({ taskId }: TaskActivityListProps) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTaskActivity(taskId);

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-espresso">Histórico</h3>
      {error && <p className="text-xs text-danger">{getErrorMessage(error)}</p>}
      {activities.length === 0 && !isLoading ? (
        <p className="text-xs text-espresso-faint">Nenhuma atividade registrada.</p>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {activities.map((activity: TaskActivity) => {
            const Icon = iconByType[activity.type] ?? Circle;
            return (
              <div key={activity.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-espresso-muted" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm text-espresso">{formatActivityMessage(activity)}</p>
                  <p className="text-[10px] text-espresso-faint mt-0.5">
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasNextPage && (
        <Button
          variant="ghost"
          className="text-xs h-8"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
        </Button>
      )}
    </div>
  );
}
