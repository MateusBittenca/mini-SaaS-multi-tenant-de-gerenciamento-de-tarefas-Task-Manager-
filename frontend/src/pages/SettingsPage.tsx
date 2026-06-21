import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Building2, Tag } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { fetchers } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Role } from '../lib/types';
import {
  useCreateTag,
  useDeleteTag,
  useInviteMember,
  useMembers,
  usePendingInvites,
  useRemoveMember,
  useRevokeInvite,
  useTags,
  useTransferOwnership,
  useUpdateMemberRole,
  useUpdateWorkspace,
} from '../hooks/queries/members';
import { MembersList } from '../components/MembersList';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { PendingInvitesList } from '../components/PendingInvitesList';
import { TAG_COLOR_PRESETS } from '../components/TagSelect';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const { setActiveWorkspace, setWorkspaces } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState<string>(TAG_COLOR_PRESETS[0]);

  const workspace = getActiveWorkspace();
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const isOwner = workspace?.role === 'OWNER';

  const { data: members = [], isLoading: membersLoading } = useMembers(
    canManage ? workspaceId : undefined
  );
  const { data: pendingInvites = [] } = usePendingInvites(canManage ? workspaceId : undefined);
  const { data: tags = [] } = useTags(canManage ? workspaceId : undefined);

  const inviteMember = useInviteMember(workspaceId);
  const updateMemberRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const revokeInvite = useRevokeInvite(workspaceId);
  const createTag = useCreateTag(workspaceId);
  const deleteTag = useDeleteTag(workspaceId);
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const transferOwnership = useTransferOwnership(workspaceId);

  useEffect(() => {
    if (workspace?.name) setWorkspaceName(workspace.name);
  }, [workspace?.name]);

  const handleInvite = async (data: { email: string; role: Role }): Promise<{
    token: string;
    emailSent?: boolean;
    devInviteUrl?: string;
  }> => {
    setError('');
    try {
      return await inviteMember.mutateAsync(data);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  const handleUpdateRole = async (memberId: string, role: Role) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      await updateMemberRole.mutateAsync({ memberId, role });
      setSuccess('Função atualizada com sucesso');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      await removeMember.mutateAsync(memberId);
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
      await revokeInvite.mutateAsync(inviteId);
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
    setError('');
    setSuccess('');
    try {
      const updated = await updateWorkspace.mutateAsync(workspaceName.trim());
      const workspaces = await queryClient.fetchQuery({
        queryKey: queryKeys.workspaces,
        queryFn: fetchers.workspaces,
      });
      setWorkspaces(workspaces);
      if (workspaceId) setActiveWorkspace(workspaceId);
      setWorkspaceName(updated.name);
      setSuccess('Workspace atualizado');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    setError('');
    setSuccess('');
    try {
      await createTag.mutateAsync({ name: tagName.trim(), color: tagColor });
      setTagName('');
      setSuccess('Tag criada');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeleteTag = async (tagId: string, name: string) => {
    if (!confirm(`Excluir a tag "${name}"?`)) return;
    setActionLoading(tagId);
    setError('');
    try {
      await deleteTag.mutateAsync(tagId);
      setSuccess('Tag excluída');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    setActionLoading(memberId);
    setError('');
    setSuccess('');
    try {
      await transferOwnership.mutateAsync(memberId);
      const workspaces = await queryClient.fetchQuery({
        queryKey: queryKeys.workspaces,
        queryFn: fetchers.workspaces,
      });
      setWorkspaces(workspaces);
      setSuccess('Propriedade transferida com sucesso');
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
          className="mb-8 p-5 bg-surface border border-sand rounded-2xl space-y-4"
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
          <Button type="submit" size="sm" loading={updateWorkspace.isPending}>
            Salvar workspace
          </Button>
        </form>
      )}

      <section className="mb-8 p-5 bg-surface border border-sand rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-terracotta" />
          <h2 className="font-display font-semibold text-espresso">Tags</h2>
        </div>
        <p className="text-xs text-espresso-faint">
          Categorize tarefas com etiquetas compartilhadas no workspace.
        </p>

        {tags.length > 0 ? (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-cream-dark/50"
              >
                <span className="inline-flex items-center gap-2 text-sm text-espresso">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  disabled={actionLoading === tag.id}
                  className="text-xs text-espresso-faint hover:text-danger transition-colors"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-espresso-faint">Nenhuma tag criada ainda.</p>
        )}

        <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-sand">
          <Input
            label="Nova tag"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Ex: Bug, Melhoria..."
            className="flex-1"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-espresso">Cor</label>
            <div className="flex gap-1.5 flex-wrap">
              {TAG_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    tagColor === color ? 'border-espresso scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm" loading={createTag.isPending} disabled={!tagName.trim()}>
              Criar tag
            </Button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {membersLoading ? (
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
