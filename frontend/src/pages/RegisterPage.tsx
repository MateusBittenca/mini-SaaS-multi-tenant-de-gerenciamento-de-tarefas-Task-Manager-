import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Logo } from '../components/Logo';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.post('/auth/register', data);
      setAuth(res.data.user, res.data.accessToken);
      navigate('/workspaces');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-espresso relative overflow-hidden flex-col justify-between p-12">
        <Logo size="md" />
        <div className="relative z-10">
          <blockquote className="font-display text-4xl font-semibold text-white leading-tight mb-6">
            Comece com<br />
            <span className="text-sage">um workspace.</span><br />
            Cresça com muitos.
          </blockquote>
          <p className="text-white/50 text-lg max-w-md">
            Multi-tenant de verdade: times, projetos e tarefas no mesmo lugar.
          </p>
        </div>
        <p className="text-white/30 text-sm">© 2026 Trama</p>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-terracotta/10 blur-3xl" aria-hidden />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8">
            <Logo size="lg" showTagline />
          </div>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-espresso">Criar conta</h1>
            <p className="text-espresso-muted mt-2">Leva menos de um minuto.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Nome"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Seu nome"
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="voce@empresa.com"
            />
            <Input
              label="Senha"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="Mínimo 8 caracteres"
              hint="Use pelo menos 8 caracteres"
            />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-espresso-muted mt-8">
            Já tem conta?{' '}
            <Link to="/login" className="text-terracotta font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
