'use client';

import { useMemo, useState, useId } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Column = {
  /** Unique key referenced by row.values & row.cells. */
  key: string;
  /** Header label. */
  label: string;
  /** Sortable? defaults to true. */
  sortable?: boolean;
  /** Cell alignment. */
  align?: 'left' | 'right' | 'center';
  /** Optional Tailwind classes for the <th> only. */
  thClassName?: string;
  /** Optional Tailwind classes for all <td> in this column. */
  tdClassName?: string;
  /** Width hint (Tailwind class, e.g. 'w-32'). */
  width?: string;
};

export type Row = {
  /** Unique row id (for React key). */
  key: string | number;
  /** Raw sortable values per column key (string|number|Date). */
  values: Record<string, string | number | Date | null | undefined>;
  /** Pre-rendered React nodes per column key. */
  cells: Record<string, React.ReactNode>;
};

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
}

export function DataTable({
  columns,
  rows,
  emptyMessage = 'Tidak ada data.',
  defaultSort,
}: {
  columns: Column[];
  rows: Row[];
  emptyMessage?: string;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sort, setSort] = useState<SortState>(defaultSort ?? null);
  const id = useId();

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const cmp = compare(a.values[sort.key], b.values[sort.key]);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-sm" aria-describedby={id}>
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {columns.map((c) => {
              const isSortable = c.sortable !== false;
              const isActive = sort?.key === c.key;
              const align = c.align ?? 'left';
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 font-medium select-none',
                    ALIGN_CLASS[align],
                    c.width,
                    c.thClassName,
                  )}
                  aria-sort={isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
                        align === 'right' && 'flex-row-reverse',
                        isActive && 'text-slate-900',
                      )}
                      aria-label={`Sort by ${c.label}`}
                    >
                      <span>{c.label}</span>
                      {isActive ? (
                        sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {sorted.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/60 transition-colors">
              {columns.map((c) => {
                const align = c.align ?? 'left';
                return (
                  <td
                    key={c.key}
                    className={cn('px-3 py-2 text-slate-700', ALIGN_CLASS[align], c.tdClassName)}
                  >
                    {row.cells[c.key] ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p id={id} className="sr-only">Klik header kolom untuk sort A-Z atau Z-A.</p>
    </div>
  );
}
