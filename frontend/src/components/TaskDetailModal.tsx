import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { MemberSelect } from './MemberSelect';
import { TagSelect } from './TagSelect';
import { TaskComments } from './TaskComments';
import { TaskSubtasks } from './TaskSubtasks';
import { TaskActivityList } from './TaskActivityList';
import { toDateInputValue, dateInputToIso } from '../lib/dates';
import type { Tag, Task, TaskPriority, TaskStatus, WorkspaceMember } from '../lib/types';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().max(1000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface TaskDetailModalProps {
  task: Task | null;
  members: WorkspaceMember[];
  tags: Tag[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Task> & { tagIds?: string[] }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSubtasksChange?: (taskId: string, subtasks: { completed: boolean }[]) => void;
  currentUserId?: string;
  canDelete?: boolean;
  canManage?: boolean;
}

export function TaskDetailModal({
  task,
  members,
  tags,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onSubtasksChange,
  currentUserId,
  canDelete,
  canManage,
}: TaskDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const assigneeId = watch('assigneeId') ?? '';
  const tagIds = watch('tagIds') ?? [];

  useEffect(() => {
    if (task && isOpen) {
      reset({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId ?? '',
        dueDate: toDateInputValue(task.dueDate),
        tagIds: task.tags?.map((t) => t.id) ?? [],
      });
      setError('');
    }
  }, [task, isOpen, reset]);

  const handleFormSubmit = async (data: FormData) => {
    if (!task) return;
    setLoading(true);
    setError('');
    try {
      await onSave(task.id, {
        title: data.title,
        description: data.description || null,
        status: data.status as TaskStatus,
        priority: data.priority as TaskPriority,
        assigneeId: data.assigneeId || null,
        dueDate: dateInputToIso(data.dueDate ?? ''),
        tagIds: data.tagIds ?? [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    if (!confirm('Excluir esta tarefa?')) return;
    setLoading(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir tarefa');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da tarefa" size="xl">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <Input
          label="Título"
          {...register('title')}
          error={errors.title?.message}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Descrição</label>
          <textarea
            {...register('description')}
            className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
            rows={3}
          />
        </div>

        <TaskSubtasks
          taskId={task.id}
          onChange={(subtasks) => onSubtasksChange?.(task.id, subtasks)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-espresso">Status</label>
            <select
              {...register('status')}
              className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            >
              <option value="TODO">A fazer</option>
              <option value="IN_PROGRESS">Em progresso</option>
              <option value="DONE">Concluído</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-espresso">Prioridade</label>
            <select
              {...register('priority')}
              className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MemberSelect
            members={members}
            value={assigneeId}
            onChange={(v) => setValue('assigneeId', v)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-espresso">Prazo</label>
            <input
              type="date"
              {...register('dueDate')}
              className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
        </div>

        <TagSelect
          tags={tags}
          value={tagIds}
          onChange={(v) => setValue('tagIds', v)}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-between gap-2 pt-1">
          {canDelete && onDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={loading}>
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Salvar
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-sand space-y-6">
        <TaskComments taskId={task.id} currentUserId={currentUserId} canManage={canManage} />
        <TaskActivityList taskId={task.id} />
      </div>
    </Modal>
  );
}
