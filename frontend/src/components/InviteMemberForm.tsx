import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Mail, Check } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import type { Role } from '../lib/types';

const schema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

type FormData = z.infer<typeof schema>;

interface InviteMemberFormProps {
  onSubmit: (data: { email: string; role: Role }) => Promise<{ token: string }>;
}

export function InviteMemberForm({ onSubmit }: InviteMemberFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'MEMBER' },
  });

  const handleFormSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setInviteLink('');
    try {
      const result = await onSubmit({ email: data.email, role: data.role });
      const link = `${window.location.origin}/invites/${result.token}`;
      setInviteLink(link);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-white border border-sand rounded-2xl p-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-terracotta-light flex items-center justify-center">
          <Mail className="w-4 h-4 text-terracotta" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-espresso">Convidar membro</h3>
          <p className="text-xs text-espresso-faint mt-0.5">Envie um link de acesso ao workspace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="colega@empresa.com"
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-espresso">Função</label>
          <select
            {...register('role')}
            className="w-full px-3.5 py-2.5 bg-white border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          >
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        {error && <Alert>{error}</Alert>}
        {inviteLink && (
          <Alert variant="success">
            <p className="mb-2">Convite criado! Compartilhe o link:</p>
            <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2 border border-sage/20">
              <code className="text-xs text-espresso break-all flex-1">{inviteLink}</code>
              <button
                type="button"
                onClick={copyLink}
                className="p-1.5 rounded-md hover:bg-sage/10 text-sage shrink-0 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </Alert>
        )}
        <Button type="submit" loading={loading} className="w-full">
          Enviar convite
        </Button>
      </form>
    </div>
  );
}
