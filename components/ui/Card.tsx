import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('rounded-xl bg-card shadow-sm ring-1 ring-edge-soft', padding && 'p-6', className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function CardHeader({ title, actions }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-edge-soft px-6 py-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {actions}
    </div>
  );
}

interface CardSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function CardSection({ title, children, className }: CardSectionProps) {
  return (
    <Card className={className}>
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}
