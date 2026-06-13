import { Mail, X } from 'lucide-react';
import type { PendingWorkspaceInvite } from '../lib/types';

const roleLabels = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

interface PendingInvitesListProps {
  invites: PendingWorkspaceInvite[];
  onRevoke: (inviteId: string) => Promise<void>;
  actionLoading?: string | null;
}

export function PendingInvitesList({
  invites,
  onRevoke,
  actionLoading,
}: PendingInvitesListProps) {
  if (invites.length === 0) return null;

  return (
    <div
      className="bg-surface border border-sand rounded-2xl overflow-hidden mt-6"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="px-5 py-4 border-b border-sand">
        <h3 className="font-display font-semibold text-espresso text-sm">
          Convites pendentes
        </h3>
        <p className="text-xs text-espresso-faint mt-0.5">
          {invites.length} aguardando resposta
        </p>
      </div>
      <ul className="divide-y divide-sand">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 text-espresso-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-espresso truncate">{invite.email}</p>
              <p className="text-xs text-espresso-faint">
                {roleLabels[invite.role]}
                {invite.invitedBy && ` · convidado por ${invite.invitedBy.name}`}
              </p>
            </div>
            <button
              disabled={actionLoading === invite.id}
              onClick={() => onRevoke(invite.id)}
              className="p-1.5 rounded-lg text-espresso-faint hover:text-danger hover:bg-danger-light transition-colors disabled:opacity-50"
              title="Revogar convite"
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
