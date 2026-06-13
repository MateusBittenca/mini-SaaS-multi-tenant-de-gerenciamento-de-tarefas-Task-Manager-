import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { Circle, Loader, CheckCircle2 } from 'lucide-react';
import type { Task, TaskStatus } from '../lib/types';
import { KanbanColumn, type ColumnConfig } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { snapToCursor } from '../lib/dndModifiers';

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'A Fazer',
    subtitle: 'Na fila',
    icon: Circle,
    bg: 'bg-cream-dark',
    headerBg: 'bg-sand-light/80',
    accent: '#6B5E54',
    dot: '#A89888',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Em Progresso',
    subtitle: 'Em andamento',
    icon: Loader,
    bg: 'bg-amber-light/60',
    headerBg: 'bg-amber-light',
    accent: '#7A8FA8',
    dot: '#7A8FA8',
  },
  {
    id: 'DONE',
    title: 'Concluído',
    subtitle: 'Finalizadas',
    icon: CheckCircle2,
    bg: 'bg-sage-light/60',
    headerBg: 'bg-sage-light',
    accent: '#5A7A6A',
    dot: '#5A7A6A',
  },
];

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
  onDeleteTask?: (id: string) => void;
  onTaskClick?: (task: Task) => void;
  canDelete?: boolean;
}

export function KanbanBoard({ tasks, onStatusChange, onDeleteTask, onTaskClick, canDelete }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
    setActiveWidth(event.active.rect.current?.initial?.width ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveWidth(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStatus: TaskStatus | null = null;

    if (COLUMNS.some((c) => c.id === over.id)) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus && newStatus !== task.status) {
      await onStatusChange(taskId, newStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveWidth(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
        {COLUMNS.map((column) => (
          <div key={column.id} className="min-w-[280px] md:min-w-0 snap-start">
            <KanbanColumn
              config={column}
              tasks={getTasksByStatus(column.id)}
              onDeleteTask={onDeleteTask}
              onTaskClick={onTaskClick}
              canDelete={canDelete}
            />
          </div>
        ))}
      </div>

      <DragOverlay
        modifiers={[snapToCursor]}
        dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1)' }}
        style={{ cursor: 'grabbing' }}
      >
        {activeTask ? (
          <div
            style={{ width: activeWidth ?? 280 }}
            className="pointer-events-none"
          >
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { COLUMNS };
