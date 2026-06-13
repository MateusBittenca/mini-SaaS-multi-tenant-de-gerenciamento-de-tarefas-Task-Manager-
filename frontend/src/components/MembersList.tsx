import type { WorkspaceMember } from '../lib/types';
import { Crown, Shield, User } from 'lucide-react';

const roleConfig = {
  OWNER: { label: 'Proprietário', icon: Crown, className: 'bg-terracotta-light text-terracotta' },
  ADMIN: { label: 'Administrador', icon: Shield, className: 'bg-amber-light text-amber-warm' },
  MEMBER: { label: 'Membro', icon: User, className: 'bg-cream-dark text-espresso-muted' },
};

interface MembersListProps {
  members: WorkspaceMember[];
}

export function MembersList({ members }: MembersListProps) {
  return (
    <div
      className="bg-white border border-sand rounded-2xl overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="px-5 py-4 border-b border-sand">
        <h3 className="font-display font-semibold text-espresso">
          {members.length} {members.length === 1 ? 'membro' : 'membros'}
        </h3>
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

          return (
            <li key={member.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-sage/15 flex items-center justify-center text-xs font-semibold text-sage shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-espresso truncate">{member.name}</p>
                <p className="text-xs text-espresso-faint truncate">{member.email}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg ${role.className}`}
              >
                <RoleIcon className="w-3 h-3" />
                {role.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
