import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import type { TaskPriority } from '../lib/types';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; priority?: TaskPriority }) => Promise<void>;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const handleFormSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova tarefa">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <Input
          label="Título"
          {...register('title')}
          error={errors.title?.message}
          placeholder="O que precisa ser feito?"
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Descrição</label>
          <textarea
            {...register('description')}
            className="w-full px-3.5 py-2.5 bg-white border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta hover:border-espresso-faint transition-colors resize-none"
            rows={3}
            placeholder="Detalhes adicionais (opcional)"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Prioridade</label>
          <select
            {...register('priority')}
            className="w-full px-3.5 py-2.5 bg-white border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta hover:border-espresso-faint transition-colors"
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Criar tarefa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
