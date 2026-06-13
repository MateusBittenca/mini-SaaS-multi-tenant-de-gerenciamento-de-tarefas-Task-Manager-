import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AlertProps {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
}

const config = {
  error: {
    icon: AlertCircle,
    className: 'bg-danger-light border-danger/20 text-danger',
  },
  success: {
    icon: CheckCircle2,
    className: 'bg-sage-light border-sage/20 text-sage',
  },
  info: {
    icon: Info,
    className: 'bg-terracotta-light border-terracotta/20 text-terracotta',
  },
};

export function Alert({ variant = 'error', children, className = '' }: AlertProps) {
  const { icon: Icon, className: variantClass } = config[variant];

  return (
    <div
      className={`flex items-start gap-2.5 p-3.5 border rounded-xl text-sm ${variantClass} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
