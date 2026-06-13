import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import type { Project } from '../lib/types';

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
}

export function EditProjectModal({ project, isOpen, onClose, onSubmit }: EditProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      name: project.name,
      description: project.description ?? '',
    },
  });

  const handleFormSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar projeto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar projeto">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <Input label="Nome" {...register('name')} error={errors.name?.message} />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Descrição</label>
          <textarea
            {...register('description')}
            className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
