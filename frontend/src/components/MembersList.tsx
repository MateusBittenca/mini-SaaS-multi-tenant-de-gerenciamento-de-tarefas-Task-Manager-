import { useState } from 'react';
import { Crown, Shield, User, Trash2, ArrowRightLeft } from 'lucide-react';
import type { Role, WorkspaceMember } from '../lib/types';
import { Button } from './Button';

const roleConfig = {
  OWNER: { label: 'Proprietário', icon: Crown, className: 'bg-terracotta-light text-terracotta' },
  ADMIN: { label: 'Administrador', icon: Shield, className: 'bg-amber-light text-amber-warm' },
  MEMBER: { label: 'Membro', icon: User, className: 'bg-cream-dark text-espresso-muted' },
};

interface MembersListProps {
  members: WorkspaceMember[];
  currentUserId?: string;
  currentUserRole?: Role;
  onUpdateRole?: (memberId: string, role: Role) => Promise<void>;
  onRemove?: (memberId: string) => Promise<void>;
  onTransferOwnership?: (memberId: string) => Promise<void>;
  actionLoading?: string | null;
}

export function MembersList({
  members,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemove,
  onTransferOwnership,
  actionLoading,
}: MembersListProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';

  const canRemove = (member: WorkspaceMember) => {
    if (member.userId === currentUserId) return false;
    if (member.role === 'OWNER') return false;
    if (isOwner) return true;
    if (isAdmin && member.role === 'MEMBER') return true;
    return false;
  };

  const canChangeRole = (member: WorkspaceMember) =>
    isOwner && member.role !== 'OWNER' && member.userId !== currentUserId;

  const canTransfer = (member: WorkspaceMember) =>
    isOwner && member.role !== 'OWNER' && member.userId !== currentUserId;

  return (
    <div
      className="bg-surface border border-sand rounded-2xl overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="px-5 py-4 border-b border-sand">
        <h3 className="font-display font-semibold text-espresso">
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
        </h3>
        {isOwner && (
          <p className="text-xs text-espresso-faint mt-0.5">
            Como proprietário, você pode alterar funções e remover membros
          </p>
        )}
      </div>
      <ul className="divide-y divide-sand">
        {members.map((member) => {
          const role = roleConfig[member.role];
          const RoleIcon = role.icon;
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          const isSelf = member.userId === currentUserId;
          const loading = actionLoading === member.id;

          return (
            <li key={member.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-sage/15 flex items-center justify-center text-xs font-semibold text-sage shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-espresso truncate">
                    {member.name}
                    {isSelf && (
                      <span className="text-espresso-faint font-normal ml-1">(você)</span>
                    )}
                  </p>
                  <p className="text-xs text-espresso-faint truncate">{member.email}</p>
                </div>

                {canChangeRole(member) && onUpdateRole ? (
                  <select
                    value={member.role}
                    disabled={loading}
                    onChange={(e) => onUpdateRole(member.id, e.target.value as Role)}
                    className="text-xs border border-sand rounded-lg px-2 py-1.5 bg-surface text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="MEMBER">Membro</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg shrink-0 ${role.className}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {role.label}
                  </span>
                )}
              </div>

              {(canTransfer(member) || canRemove(member)) && (
                <div className="flex items-center gap-3 mt-3 justify-end flex-wrap">
                  {canTransfer(member) && onTransferOwnership && (
                    <button
                      disabled={loading}
                      onClick={() => {
                        if (
                          confirm(
                            `Transferir a propriedade do workspace para ${member.name}? Você passará a ser Administrador.`
                          )
                        ) {
                          onTransferOwnership(member.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-espresso-muted hover:text-terracotta transition-colors disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transferir propriedade
                    </button>
                  )}
                  {canRemove(member) && onRemove && (
                    <>
                      {confirmRemove === member.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-danger">Confirmar?</span>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={loading}
                            onClick={() => {
                              onRemove(member.id);
                              setConfirmRemove(null);
                            }}
                          >
                            Remover
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmRemove(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button
                          disabled={loading}
                          onClick={() => setConfirmRemove(member.id)}
                          className="flex items-center gap-1 text-xs text-espresso-faint hover:text-danger transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
