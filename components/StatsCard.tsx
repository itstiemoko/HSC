import type { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  subtitle?: string;
}

const ICON_COLORS: Record<string, string> = {
  blue: 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  green: 'bg-green-600/10 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  amber: 'bg-amber-600/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-600/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  purple: 'bg-purple-600/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  orange: 'bg-orange-600/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  gray: 'bg-muted text-ink-muted',
};

export default function StatsCard({ title, value, icon, color = 'blue', subtitle }: StatsCardProps) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm ring-1 ring-edge-soft transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-muted">{title}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-ink sm:text-2xl">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-ink-dim">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${ICON_COLORS[color] || ICON_COLORS.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
