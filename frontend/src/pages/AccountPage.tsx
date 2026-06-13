import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

const schema = z
  .object({
    name: z.string().min(2, 'Nome é obrigatório'),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword !== data.confirmPassword) return false;
      return true;
    },
    { message: 'As senhas não coincidem', path: ['confirmPassword'] }
  );

type FormData = z.infer<typeof schema>;

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {
        name: data.name,
      };
      if (data.newPassword) {
        payload.currentPassword = data.currentPassword;
        payload.newPassword = data.newPassword;
      }
      const { data: res } = await api.patch<{ data: NonNullable<typeof user> }>('/auth/me', payload);
      if (!res.data) throw new Error('Resposta inválida');
      setUser(res.data);
      setSuccess('Perfil atualizado com sucesso');
      reset({
        name: res.data.name,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-lg">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-sage-light flex items-center justify-center">
            <User className="w-4 h-4 text-sage" />
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
            Minha conta
          </h1>
        </div>
        <p className="text-espresso-muted text-sm">Atualize seu nome e senha.</p>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white border border-sand rounded-2xl p-6">
        <Input label="Nome" {...register('name')} error={errors.name?.message} />
        <Input label="Email" value={user?.email ?? ''} disabled />
        <div className="pt-2 border-t border-sand">
          <p className="text-sm font-medium text-espresso mb-4">Alterar senha</p>
          <div className="space-y-4">
            <Input
              label="Senha atual"
              type="password"
              {...register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <Input
              label="Nova senha"
              type="password"
              {...register('newPassword')}
              error={errors.newPassword?.message}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
          </div>
        </div>
        <Button type="submit" loading={loading}>
          Salvar alterações
        </Button>
      </form>
    </div>
  );
}
