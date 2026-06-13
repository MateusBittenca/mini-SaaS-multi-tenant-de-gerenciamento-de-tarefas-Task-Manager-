import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { InvitePreview } from '../lib/types';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Logo } from '../components/Logo';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/invites/${token}`);
      return;
    }
    loadInvite();
  }, [token, isAuthenticated]);

  const loadInvite = async () => {
    try {
      const { data: res } = await api.get<{ data: InvitePreview }>(
        `/workspaces/invites/${token}`
      );
      setInvite(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    try {
      const { data: res } = await api.post<{ data: { workspaceId: string } }>(
        `/workspaces/invites/${token}/accept`
      );
      setSuccess(true);
      setTimeout(() => navigate(`/w/${res.data.workspaceId}`), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10">
        <Logo size="lg" showTagline />
      </div>

      <div
        className="w-full max-w-md bg-surface border border-sand rounded-2xl p-8 text-center animate-fade-in"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {loading ? (
          <LoadingSkeleton variant="list" rows={2} />
        ) : error && !invite ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-danger-light flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-danger" />
            </div>
            <p className="text-danger mb-6">{error}</p>
            <Button variant="secondary" onClick={() => navigate('/workspaces')}>
              Ir para workspaces
            </Button>
          </div>
        ) : invite?.accepted ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sage-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-sage" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Convite já aceito</h2>
            <p className="text-espresso-muted mb-6">
              Você já faz parte do workspace <strong>{invite.workspaceName}</strong>.
            </p>
            <Button onClick={() => navigate(`/w/${invite.workspaceId}`)}>
              Ir para o workspace
            </Button>
          </div>
        ) : invite?.expired ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-light flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-amber-warm" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Convite expirado</h2>
            <p className="text-espresso-muted">Peça um novo convite ao administrador do workspace.</p>
          </div>
        ) : success ? (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sage-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-sage" />
            </div>
            <h2 className="font-display text-xl font-semibold text-sage mb-2">Bem-vindo à equipe!</h2>
            <p className="text-espresso-muted">Redirecionando...</p>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-terracotta-light flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-terracotta" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Você foi convidado</h2>
            <p className="text-espresso-muted mb-1">
              Para o workspace <strong className="text-espresso">{invite?.workspaceName}</strong>
            </p>
            <p className="text-sm text-espresso-faint mb-6">
              como{' '}
              <span className="font-medium text-espresso">
                {invite?.role === 'ADMIN' ? 'Administrador' : 'Membro'}
              </span>
            </p>
            {error && <Alert className="mb-4 text-left">{error}</Alert>}
            <Button onClick={handleAccept} loading={accepting} className="w-full" size="lg">
              Aceitar convite
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
