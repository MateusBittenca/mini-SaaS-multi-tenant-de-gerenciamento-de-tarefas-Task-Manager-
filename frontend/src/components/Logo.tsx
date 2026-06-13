import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
  showTagline?: boolean;
}

const sizes = {
  sm: { icon: 'w-7 h-7', text: 'text-lg', tagline: 'text-[10px]' },
  md: { icon: 'w-8 h-8', text: 'text-xl', tagline: 'text-xs' },
  lg: { icon: 'w-10 h-10', text: 'text-2xl', tagline: 'text-sm' },
};

export function Logo({ size = 'md', linkTo, showTagline = false }: LogoProps) {
  const s = sizes[size];

  const content = (
    <div className="flex items-center gap-2.5">
      <div
        className={`${s.icon} rounded-lg bg-espresso flex items-center justify-center shrink-0`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="w-[55%] h-[55%] text-terracotta" fill="none">
          <path d="M5 8h14M5 12h10M5 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="12" r="1.5" className="fill-sage" />
        </svg>
      </div>
      <div>
        <span className={`font-display font-semibold text-espresso ${s.text} tracking-tight`}>
          Trama
        </span>
        {showTagline && (
          <p className={`text-espresso-faint ${s.tagline} leading-none mt-0.5`}>
            Projetos em harmonia
          </p>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
