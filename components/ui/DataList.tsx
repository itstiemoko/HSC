import { cn } from '@/lib/cn';

interface DataListItem {
  label: string;
  value: string | number | null | undefined;
}

interface DataListProps {
  items: DataListItem[];
  columns?: 2 | 3;
  variant?: 'grid' | 'rows';
}

export default function DataList({ items, columns = 3, variant = 'grid' }: DataListProps) {
  if (variant === 'rows') {
    return (
      <dl className="space-y-3">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-sm font-medium text-ink">{value || '-'}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn(
      'grid grid-cols-1 gap-4 sm:grid-cols-2',
      columns === 3 && 'lg:grid-cols-3',
    )}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs font-medium uppercase text-ink-muted">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-ink">{value || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
