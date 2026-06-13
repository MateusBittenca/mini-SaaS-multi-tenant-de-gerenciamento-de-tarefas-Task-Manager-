import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onSubmit }: CreateProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleFormSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo projeto">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <Input
          label="Nome"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Ex: Redesign do site"
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Descrição</label>
          <textarea
            {...register('description')}
            className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso placeholder:text-espresso-faint focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta hover:border-espresso-faint transition-colors resize-none"
            rows={3}
            placeholder="Opcional — descreva o objetivo do projeto"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Criar projeto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
