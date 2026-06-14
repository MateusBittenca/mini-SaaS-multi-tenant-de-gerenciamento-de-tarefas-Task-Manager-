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
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
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
      const { data: res } = await api.post('/auth/login', data);
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
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <Logo size="md" />
        <div className="relative z-10">
          <blockquote className="font-display text-4xl font-semibold text-white leading-tight mb-6">
            Cada projeto é um fio.<br />
            <span className="text-terracotta">Trama</span> os conecta.
          </blockquote>
          <p className="text-white/50 text-lg max-w-md">
            Organize workspaces, projetos e tarefas com clareza — sem o ruído dos apps genéricos.
          </p>
        </div>
        <p className="text-white/30 text-sm">© 2026 Trama</p>
        {/* Decorative lines */}
        <div className="absolute inset-0 opacity-10" aria-hidden>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px bg-white"
              style={{ top: `${15 + i * 14}%`, left: 0, right: 0, transform: `rotate(${-2 + i}deg)` }}
            />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8">
            <Logo size="lg" showTagline />
          </div>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-espresso">Bem-vindo de volta</h1>
            <p className="text-espresso-muted mt-2">Entre para continuar de onde parou.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              placeholder="••••••••"
            />
            <div className="flex justify-end -mt-2">
              <Link
                to="/forgot-password"
                className="text-xs text-terracotta hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-espresso-muted mt-8">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-terracotta font-medium hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
