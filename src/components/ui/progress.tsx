import { cn } from '@/lib/cn';

export function Progress({
  value,
  max = 100,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const overflow = value > max;
  const color =
    overflow ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-slate-100 h-2', className)}>
      <div
        className={cn('h-full transition-all', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
