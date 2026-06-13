import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../lib/types';
import { TaskCard } from './TaskCard';

interface SortableTaskCardProps {
  task: Task;
  onDelete?: (id: string) => void;
  onClick?: (task: Task) => void;
  canDelete?: boolean;
}

export function SortableTaskCard({ task, onDelete, onClick, canDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group touch-none ${isDragging ? 'opacity-0' : 'opacity-100'}`}
    >
      <TaskCard task={task} onDelete={onDelete} onClick={onClick} canDelete={canDelete} />
    </div>
  );
}
