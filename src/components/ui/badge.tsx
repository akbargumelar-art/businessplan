import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple';

const styles: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-slate-100 text-slate-700',
  purple: 'bg-purple-100 text-purple-800',
};

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

const STATUS_MAP: Record<string, Variant> = {
  draft: 'gray',
  final: 'blue',
  cancelled: 'red',
  submitted: 'yellow',
  supervisor_reviewed: 'blue',
  admin_approved: 'green',
  approved: 'green',
  rejected: 'red',
  active: 'green',
  locked: 'yellow',
  closed: 'gray',
  planning: 'purple',
};

export function StatusBadge({ status }: { status: string }) {
  const v = STATUS_MAP[status] ?? 'default';
  return <Badge variant={v}>{status.replace(/_/g, ' ')}</Badge>;
}
