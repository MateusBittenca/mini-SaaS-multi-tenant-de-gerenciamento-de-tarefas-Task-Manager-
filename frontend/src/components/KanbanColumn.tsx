import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { LucideIcon } from 'lucide-react';
import type { Task, TaskStatus } from '../lib/types';
import { SortableTaskCard } from './SortableTaskCard';

export interface ColumnConfig {
  id: TaskStatus;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  bg: string;
  headerBg: string;
  accent: string;
  dot: string;
}

interface KanbanColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  onDeleteTask?: (id: string) => void;
  onTaskClick?: (task: Task) => void;
  canDelete?: boolean;
}

export function KanbanColumn({ config, tasks, onDeleteTask, onTaskClick, canDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: config.id });
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[480px] ${config.bg} ${
        isOver ? 'border-terracotta/50 ring-2 ring-terracotta/20 scale-[1.01]' : 'border-transparent'
      }`}
    >
      {/* Column header */}
      <div className={`px-4 py-3.5 rounded-t-2xl ${config.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: config.accent + '22' }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: config.accent }} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-espresso">{config.title}</h3>
              <p className="text-[10px] text-espresso-faint">{config.subtitle}</p>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: config.accent + '18', color: config.accent }}
          >
            {tasks.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full bg-white/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: config.accent,
              width: tasks.length > 0 ? '100%' : '0%',
              opacity: tasks.length > 0 ? 0.6 : 0,
            }}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-2.5 overflow-y-auto">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-colors ${
                isOver ? 'border-terracotta/40 bg-white/60' : 'border-espresso-faint/20'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full mb-2"
                style={{ backgroundColor: config.dot }}
              />
              <p className="text-xs text-espresso-faint">Arraste tarefas aqui</p>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onDelete={onDeleteTask}
                onClick={onTaskClick}
                canDelete={canDelete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
