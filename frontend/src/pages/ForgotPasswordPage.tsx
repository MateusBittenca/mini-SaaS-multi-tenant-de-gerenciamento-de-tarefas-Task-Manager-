import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Mail, Check } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Logo } from '../components/Logo';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setDevResetUrl('');
    setEmailSent(null);
    try {
      const { data: res } = await api.post<{
        data: { message: string; emailSent?: boolean; devResetUrl?: string };
      }>('/auth/forgot-password', data);
      setSuccess(res.data.message);
      setEmailSent(res.data.emailSent ?? null);
      if (res.data.devResetUrl) setDevResetUrl(res.data.devResetUrl);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!devResetUrl) return;
    await navigator.clipboard.writeText(devResetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-terracotta-light flex items-center justify-center">
              <Mail className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-espresso">Esqueceu a senha?</h1>
              <p className="text-xs text-espresso-faint mt-0.5">
                Enviaremos um link para redefinir
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="voce@empresa.com"
            />
            {error && <Alert>{error}</Alert>}
            {success && (
              <Alert variant="success">
                {success}
                {emailSent === true && (
                  <p className="mt-2 text-xs opacity-90">Verifique sua caixa de entrada e o spam.</p>
                )}
              </Alert>
            )}
            {emailSent === false && (
              <Alert variant="info">
                O e-mail não pôde ser enviado (limite do Resend em modo teste). Use o link abaixo ou
                teste com o e-mail da sua conta Resend.
              </Alert>
            )}
            {devResetUrl && (
              <div className="flex items-center gap-2 bg-cream-dark rounded-lg p-2 border border-sand">
                <code className="text-xs text-espresso break-all flex-1">{devResetUrl}</code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="p-1.5 rounded-md hover:bg-surface text-terracotta shrink-0 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!!success}>
              Enviar link
            </Button>
          </form>

          <p className="text-center text-sm text-espresso-muted mt-6">
            <Link to="/login" className="text-terracotta font-medium hover:underline">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
