import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ChevronRight, LogOut } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useCreateWorkspace, useWorkspaces } from '../hooks/queries/workspace';
import type { Workspace } from '../lib/types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Logo } from '../components/Logo';
import { NotificationBell } from '../components/NotificationBell';

const roleLabels = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export function WorkspacesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const clearWorkspace = useWorkspaceStore((s) => s.clear);
  const { data: workspaces = [], isLoading, error: queryError } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (workspaces.length > 0) {
      setWorkspaces(workspaces);
    }
  }, [workspaces, setWorkspaces]);

  const selectWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace.id);
    navigate(`/w/${workspace.id}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    try {
      const workspace = await createWorkspace.mutateAsync(newName.trim());
      setNewName('');
      setShowCreate(false);
      selectWorkspace(workspace);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    logout();
    clearWorkspace();
    navigate('/login');
  };

  const displayError = error || (queryError ? getErrorMessage(queryError) : '');

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-sand bg-cream/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo linkTo="/workspaces" />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-espresso-muted hidden sm:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-espresso-faint hover:text-espresso transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-espresso">
            Seus workspaces
          </h1>
          <p className="text-espresso-muted mt-2">
            Escolha onde quer trabalhar hoje.
          </p>
        </div>

        {displayError && <Alert className="mb-6">{displayError}</Alert>}

        {isLoading ? (
          <LoadingSkeleton variant="list" rows={3} />
        ) : workspaces.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhum workspace ainda"
            description="Crie seu primeiro workspace para começar a organizar projetos e tarefas com sua equipe."
            action={{ label: 'Criar workspace', onClick: () => setShowCreate(true) }}
          />
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => selectWorkspace(ws)}
                className="group w-full flex items-center gap-4 bg-surface border border-sand rounded-2xl p-5 text-left transition-all hover:border-terracotta/30 hover:shadow-card-hover"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="w-11 h-11 rounded-xl bg-cream-dark border border-sand flex items-center justify-center shrink-0 group-hover:bg-terracotta-light group-hover:border-terracotta/20 transition-colors">
                  <Building2 className="w-5 h-5 text-espresso-muted group-hover:text-terracotta transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-espresso truncate">
                    {ws.name}
                  </h3>
                  <p className="text-sm text-espresso-faint mt-0.5">{roleLabels[ws.role]}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-espresso-faint group-hover:text-terracotta transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}

        {workspaces.length > 0 && (
          <div className="mt-6">
            <Button variant="secondary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              Novo workspace
            </Button>
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo workspace">
          <form onSubmit={handleCreate} className="space-y-5">
            <Input
              label="Nome do workspace"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Acme Inc"
              hint="Pode ser o nome da sua empresa ou equipe"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createWorkspace.isPending}>
                Criar
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
