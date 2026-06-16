import type { Task, TaskPriority } from '../lib/types';
import { TagPills } from './TagSelect';
import { AlertTriangle, CheckSquare, Minus, Trash2, User } from 'lucide-react';

const priorityConfig: Record<
  TaskPriority,
  { label: string; className: string; icon: typeof Minus }
> = {
  LOW: { label: 'Baixa', className: 'bg-cream-dark text-espresso-muted border-sand', icon: Minus },
  MEDIUM: {
    label: 'Média',
    className: 'bg-amber-light text-amber-warm border-amber-warm/20',
    icon: Minus,
  },
  HIGH: {
    label: 'Alta',
    className: 'bg-terracotta-light text-terracotta border-terracotta/20',
    icon: AlertTriangle,
  },
};

interface TaskCardProps {
  task: Task;
  onDelete?: (id: string) => void;
  onClick?: (task: Task) => void;
  canDelete?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({ task, onDelete, onClick, canDelete, isOverlay }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const PriorityIcon = priority.icon;

  const dueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null;

  const subtaskTotal = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(task);
        }
      }}
      className={`bg-surface rounded-xl border p-3.5 ${
        isOverlay
          ? 'border-terracotta/50 shadow-card-hover rotate-1'
          : `border-sand hover:border-espresso-faint transition-shadow ${onClick ? 'cursor-pointer' : ''}`
      }`}
      data-testid={`task-card-${task.id}`}
      style={{ boxShadow: isOverlay ? 'var(--shadow-card-hover)' : 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${priority.className}`}
          >
            <PriorityIcon className="w-2.5 h-2.5" />
            {priority.label}
          </span>
        </div>
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-0.5 rounded text-espresso-faint hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Excluir tarefa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {task.tags && task.tags.length > 0 && <TagPills tags={task.tags} />}

      <h4 className="text-sm font-medium text-espresso leading-snug mb-1">{task.title}</h4>

      {task.description && (
        <p className="text-xs text-espresso-muted line-clamp-2 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-sand/60">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-sage/20 flex items-center justify-center">
              <User className="w-2.5 h-2.5 text-sage" />
            </div>
            <span className="text-[11px] text-espresso-muted truncate max-w-[80px]">
              {task.assignee.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {subtaskTotal > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-espresso-faint">
              <CheckSquare className="w-3 h-3" />
              {subtaskDone}/{subtaskTotal}
            </span>
          )}
          {dueDate && (
            <span className="text-[10px] text-espresso-faint">{dueDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}
