import type { ActivityType, TaskActivity } from '../lib/types';

const statusLabels: Record<string, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em progresso',
  DONE: 'Concluído',
};

export function formatActivityMessage(activity: TaskActivity): string {
  const name = activity.actor.name.split(' ')[0];
  const meta = activity.metadata ?? {};

  switch (activity.type as ActivityType) {
    case 'TASK_CREATED':
      return `${name} criou a tarefa`;
    case 'TASK_UPDATED':
      return `${name} atualizou a tarefa`;
    case 'TASK_STATUS_CHANGED':
      return `${name} moveu para ${statusLabels[String(meta.to)] ?? String(meta.to)}`;
    case 'TASK_ASSIGNED':
      return meta.assigneeName
        ? `${name} atribuiu para ${meta.assigneeName}`
        : `${name} atribuiu um responsável`;
    case 'TASK_UNASSIGNED':
      return `${name} removeu o responsável`;
    case 'TASK_DUE_DATE_CHANGED':
      return meta.to
        ? `${name} definiu o prazo`
        : `${name} removeu o prazo`;
    case 'TASK_DELETED':
      return `${name} excluiu a tarefa`;
    case 'COMMENT_ADDED':
      return `${name} comentou`;
    case 'COMMENT_DELETED':
      return `${name} removeu um comentário`;
    default:
      return `${name} realizou uma ação`;
  }
}
