import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, TaskStatus } from '../lib/types';
import {
  buildMonthGrid,
  dateKeyToIso,
  isOverdue,
  isToday,
  toLocalDateKey,
} from '../lib/dates';

interface StatusMeta {
  label: string;
  color: string;
}

interface CalendarViewProps {
  tasks: Task[];
  statusMeta: Record<TaskStatus, StatusMeta>;
  onTaskClick: (task: Task) => void;
  onDueDateChange: (taskId: string, dueDate: string) => Promise<void>;
}

function DraggableTask({
  task,
  statusColor,
  onClick,
}: {
  task: Task;
  statusColor: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate border-l-2 bg-surface hover:bg-cream-dark transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${overdue ? 'text-danger' : 'text-espresso'}`}
      style={{ borderLeftColor: statusColor }}
      title={task.title}
    >
      {task.title}
    </button>
  );
}

function DayCell({
  dateKey,
  day,
  inMonth,
  tasks,
  statusMeta,
  onTaskClick,
}: {
  dateKey: string;
  day: number;
  inMonth: boolean;
  tasks: Task[];
  statusMeta: Record<TaskStatus, StatusMeta>;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const today = isToday(dateKey);

  return (
    <div
      ref={setNodeRef}
      data-testid={`calendar-day-${dateKey}`}
      className={`min-h-[88px] p-1.5 border border-sand/60 flex flex-col gap-0.5 ${
        inMonth ? 'bg-surface' : 'bg-cream-dark/40'
      } ${isOver ? 'ring-2 ring-terracotta/40 ring-inset' : ''} ${today ? 'bg-terracotta-light/30' : ''}`}
    >
      <span
        className={`text-xs font-medium mb-0.5 ${
          today
            ? 'w-6 h-6 flex items-center justify-center rounded-full bg-terracotta text-white'
            : inMonth
              ? 'text-espresso'
              : 'text-espresso-faint'
        }`}
      >
        {day}
      </span>
      <div className="space-y-0.5 flex-1 overflow-y-auto max-h-24">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            statusColor={statusMeta[task.status].color}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}

export function CalendarView({
  tasks,
  statusMeta,
  onTaskClick,
  onDueDateChange,
}: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksWithDue = useMemo(
    () => tasks.filter((t) => t.dueDate),
    [tasks]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasksWithDue) {
      const key = toLocalDateKey(task.dueDate!);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasksWithDue]);

  const { cells, weekdays } = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as Task | undefined;
    const targetDateKey = String(over.id);
    if (!task?.dueDate) return;

    const currentKey = toLocalDateKey(task.dueDate);
    if (currentKey === targetDateKey) return;

    await onDueDateChange(task.id, dateKeyToIso(targetDateKey));
  };

  return (
    <div className="bg-surface border border-sand rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sand bg-cream-dark/30">
        <button
          type="button"
          onClick={goPrev}
          className="p-1.5 rounded-lg text-espresso-faint hover:text-terracotta hover:bg-cream-dark transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-display text-lg font-semibold text-espresso capitalize">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={goNext}
          className="p-1.5 rounded-lg text-espresso-faint hover:text-terracotta hover:bg-cream-dark transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 border-b border-sand">
          {weekdays.map((wd) => (
            <div
              key={wd}
              className="py-2 text-center text-xs font-medium text-espresso-muted border-r border-sand/60 last:border-r-0"
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => (
            <DayCell
              key={cell.dateKey}
              dateKey={cell.dateKey}
              day={cell.day}
              inMonth={cell.inMonth}
              tasks={tasksByDate.get(cell.dateKey) ?? []}
              statusMeta={statusMeta}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div
              className="text-[11px] px-2 py-1 rounded bg-surface border border-terracotta/50 shadow-card-hover truncate max-w-[120px]"
              style={{ borderLeftWidth: 2, borderLeftColor: statusMeta[activeTask.status].color }}
            >
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
