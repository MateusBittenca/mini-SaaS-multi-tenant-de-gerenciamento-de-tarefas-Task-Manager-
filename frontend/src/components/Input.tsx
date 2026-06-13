interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id || props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-espresso">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-espresso placeholder:text-espresso-faint transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta ${
          error ? 'border-danger' : 'border-sand hover:border-espresso-faint'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-espresso-faint">{hint}</p>}
    </div>
  );
}
