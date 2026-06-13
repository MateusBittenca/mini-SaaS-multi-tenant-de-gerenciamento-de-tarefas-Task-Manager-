import type { WorkspaceMember } from '../lib/types';

interface MemberSelectProps {
  members: WorkspaceMember[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function MemberSelect({ members, value, onChange, label = 'Responsável' }: MemberSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-espresso">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-surface border border-sand rounded-lg text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta hover:border-espresso-faint transition-colors"
      >
        <option value="">Sem responsável</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
