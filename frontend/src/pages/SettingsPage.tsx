import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Users, Building2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Role, Workspace, WorkspaceMember, PendingWorkspaceInvite } from '../lib/types';
import { MembersList } from '../components/MembersList';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { PendingInvitesList } from '../components/PendingInvitesList';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingWorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSaving, setWorkspaceSaving] = useState(false);

  const workspace = getActiveWorkspace();
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const isOwner = workspace?.role === 'OWNER';

  useEffect(() => {
    if (workspace?.name) setWorkspaceName(workspace.name);
  }, [workspace?.name]);

  useEffect(() => {
    if (workspaceId && canManage) {
      loadData();
    }
  }, [workspaceId, canManage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`),
        api.get<{ data: PendingWorkspaceInvite[] }>(`/workspaces/${workspaceId}/invites`),
      ]);
      setMembers(membersRes.data.data);
      setPendingInvites(invitesRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (data: { email: string; role: Role }) => {
    const { data: res } = await api.post<{ data: { token: string } }>(
      `/workspaces/${workspaceId}/invite`,
      data
    );
    await loadData();
    return res.data;
  };

  const handleUpdateRole = async (memberId: string, role: Role) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      const { data: res } = await api.patch<{ data: WorkspaceMember }>(
        `/workspaces/${workspaceId}/members/${memberId}`,
        { role }
      );
      setMembers((prev) => prev.map((m) => (m.id === memberId ? res.data : m)));
      setSuccess('Função atualizada com sucesso');
    } catch (err) {
      setError(getErrorMessage(err));
      await loadData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccess('Membro removido do workspace');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError('');
    try {
      await api.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setSuccess('Convite revogado');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setWorkspaceSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/workspaces/${workspaceId}`, { name: workspaceName.trim() });
      const { data: res } = await api.get<{ data: Workspace[] }>('/workspaces');
      setWorkspaces(res.data);
      const updated = res.data.find((w) => w.id === workspaceId);
      if (updated) setActiveWorkspace(updated.id);
      setSuccess('Workspace atualizado');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorkspaceSaving(false);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      await api.post(`/workspaces/${workspaceId}/transfer-ownership`, { memberId });

      const updatedWorkspaces = workspaces.map((w) =>
        w.id === workspaceId ? { ...w, role: 'ADMIN' as Role } : w
      );
      setWorkspaces(updatedWorkspaces);

      const { data: res } = await api.get<{ data: Workspace[] }>('/workspaces');
      setWorkspaces(res.data);

      const updated = res.data.find((w) => w.id === workspaceId);
      if (updated) setActiveWorkspace(updated.id);

      setSuccess('Propriedade transferida com sucesso');
      await loadData();
      navigate(`/w/${workspaceId}/settings`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (!canManage) {
    return <Navigate to={`/w/${workspaceId}`} replace />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-sage-light flex items-center justify-center">
            <Users className="w-4 h-4 text-sage" />
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-espresso">
            Equipe
          </h1>
        </div>
        <p className="text-espresso-muted text-sm">
          {isOwner
            ? `Gerencie membros, funções e convites do workspace ${workspace?.name}.`
            : `Gerencie convites e membros do workspace ${workspace?.name}.`}
        </p>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {isOwner && (
        <form
          onSubmit={handleUpdateWorkspace}
          className="mb-8 p-5 bg-white border border-sand rounded-2xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-terracotta" />
            <h2 className="font-display font-semibold text-espresso">Workspace</h2>
          </div>
          <Input
            label="Nome do workspace"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <Button type="submit" size="sm" loading={workspaceSaving}>
            Salvar workspace
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {loading ? (
            <LoadingSkeleton variant="list" rows={4} />
          ) : (
            <>
              <MembersList
                members={members}
                currentUserId={user?.id}
                currentUserRole={workspace?.role}
                onUpdateRole={isOwner ? handleUpdateRole : undefined}
                onRemove={handleRemove}
                onTransferOwnership={isOwner ? handleTransferOwnership : undefined}
                actionLoading={actionLoading}
              />
              <PendingInvitesList
                invites={pendingInvites}
                onRevoke={handleRevokeInvite}
                actionLoading={actionLoading}
              />
            </>
          )}
        </div>
        <div className="lg:col-span-2">
          <InviteMemberForm onSubmit={handleInvite} />
        </div>
      </div>
    </div>
  );
}
