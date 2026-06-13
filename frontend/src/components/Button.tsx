import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:
    'bg-terracotta text-white hover:bg-terracotta-hover shadow-sm active:scale-[0.98]',
  secondary:
    'bg-surface text-espresso border border-sand hover:bg-cream-dark hover:border-espresso-faint',
  ghost:
    'text-espresso-muted hover:text-espresso hover:bg-cream-dark',
  danger:
    'bg-danger text-white hover:bg-danger/90 shadow-sm',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? 'Aguarde...' : children}
    </button>
  );
}
