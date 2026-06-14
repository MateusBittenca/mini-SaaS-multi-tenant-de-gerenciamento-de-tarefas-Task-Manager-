import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, CheckCircle2, XCircle } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Logo } from '../components/Logo';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const schema = z
  .object({
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface ResetTokenPreview {
  valid: boolean;
  expired: boolean;
  email?: string;
}

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ResetTokenPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (token) loadPreview();
  }, [token]);

  const loadPreview = async () => {
    try {
      const { data: res } = await api.get<{ data: ResetTokenPreview }>(
        `/auth/reset-password/${token}`
      );
      setPreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/auth/reset-password/${token}`, { password: data.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const invalid = preview && (!preview.valid || preview.expired);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-cream">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Logo size="lg" showTagline />
        </div>

        <div
          className="bg-surface border border-sand rounded-2xl p-8"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {loading ? (
            <LoadingSkeleton variant="list" rows={2} />
          ) : success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-sage-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-sage" />
              </div>
              <h1 className="font-display text-xl font-semibold text-espresso mb-2">
                Senha redefinida!
              </h1>
              <p className="text-sm text-espresso-muted">Redirecionando para o login...</p>
            </div>
          ) : invalid ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-danger-light flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-danger" />
              </div>
              <h1 className="font-display text-xl font-semibold text-espresso mb-2">
                Link inválido ou expirado
              </h1>
              <p className="text-sm text-espresso-muted mb-6">
                Solicite um novo link de recuperação de senha.
              </p>
              <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                Solicitar novo link
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-terracotta-light flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-terracotta" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-semibold text-espresso">Nova senha</h1>
                  {preview?.email && (
                    <p className="text-xs text-espresso-faint mt-0.5">Conta: {preview.email}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <Input
                  label="Nova senha"
                  type="password"
                  {...register('password')}
                  error={errors.password?.message}
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar senha"
                  type="password"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                  placeholder="••••••••"
                />
                {error && <Alert>{error}</Alert>}
                <Button type="submit" loading={submitting} className="w-full" size="lg">
                  Redefinir senha
                </Button>
              </form>
            </>
          )}

          {!success && (
            <p className="text-center text-sm text-espresso-muted mt-6">
              <Link to="/login" className="text-terracotta font-medium hover:underline">
                Voltar ao login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
