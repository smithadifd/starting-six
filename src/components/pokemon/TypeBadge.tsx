import { TYPE_COLORS } from '../../../tailwind.config';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const color = TYPE_COLORS[type] ?? '#888888';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-block rounded-full font-semibold uppercase tracking-wide text-white ${sizeClasses}`}
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
}
