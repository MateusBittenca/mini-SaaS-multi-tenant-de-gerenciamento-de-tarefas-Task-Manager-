import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { WorkspaceMember, Role } from '../lib/types';
import { MembersList } from '../components/MembersList';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { Alert } from '../components/Alert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const workspace = getActiveWorkspace();
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  useEffect(() => {
    if (workspaceId && canManage) {
      loadMembers();
    }
  }, [workspaceId, canManage]);

  const loadMembers = async () => {
    try {
      const { data: res } = await api.get<{ data: WorkspaceMember[] }>(
        `/workspaces/${workspaceId}/members`
      );
      setMembers(res.data);
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
    return res.data;
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
          Gerencie quem tem acesso ao workspace <strong className="text-espresso">{workspace?.name}</strong>.
        </p>
      </div>

      {error && <Alert className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          {loading ? <LoadingSkeleton variant="list" rows={4} /> : <MembersList members={members} />}
        </div>
        <div className="lg:col-span-2">
          <InviteMemberForm onSubmit={handleInvite} />
        </div>
      </div>
    </div>
  );
}
