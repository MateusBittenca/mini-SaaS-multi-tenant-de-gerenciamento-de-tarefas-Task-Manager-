import type { Tag } from '../lib/types';

export const TAG_COLOR_PRESETS = [
  '#C45C3E',
  '#5A7A6A',
  '#7A8FA8',
  '#B8860B',
  '#8B5A6B',
  '#6B5E54',
] as const;

interface TagSelectProps {
  tags: Tag[];
  value: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
}

export function TagSelect({ tags, value, onChange, label = 'Tags' }: TagSelectProps) {
  if (tags.length === 0) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-espresso">{label}</label>
        <p className="text-xs text-espresso-faint">Nenhuma tag disponível no workspace.</p>
      </div>
    );
  }

  const toggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-espresso">{label}</label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                selected
                  ? 'border-transparent text-white'
                  : 'border-sand bg-surface text-espresso-muted hover:border-espresso-faint'
              }`}
              style={selected ? { backgroundColor: tag.color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TagPills({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md text-white truncate max-w-[80px]"
          style={{ backgroundColor: tag.color }}
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
