import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-cream-dark border border-sand flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-espresso-muted" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-semibold text-espresso mb-2">{title}</h3>
      <p className="text-sm text-espresso-muted max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
