interface LoadingSkeletonProps {
  rows?: number;
  variant?: 'cards' | 'list' | 'kanban';
}

export function LoadingSkeleton({ rows = 3, variant = 'cards' }: LoadingSkeletonProps) {
  if (variant === 'kanban') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((col) => (
          <div key={col} className="rounded-2xl bg-cream-dark border border-sand p-4 min-h-[420px] space-y-3">
            <div className="skeleton h-5 w-24 rounded-md" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-36 rounded-2xl" />
      ))}
    </div>
  );
}
