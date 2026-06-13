import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../lib/types';
import { TaskCard } from './TaskCard';

interface SortableTaskCardProps {
  task: Task;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export function SortableTaskCard({ task, onDelete, canDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group cursor-grab active:cursor-grabbing">
      <TaskCard
        task={task}
        onDelete={onDelete}
        canDelete={canDelete}
        isDragging={isDragging}
      />
    </div>
  );
}
