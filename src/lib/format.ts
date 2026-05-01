import { Prisma } from '@prisma/client';

export type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export function toNumber(v: DecimalLike): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return Number(v.toString());
}

export function formatIDR(v: DecimalLike): string {
  const n = toNumber(v);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(v: DecimalLike): string {
  return new Intl.NumberFormat('id-ID').format(toNumber(v));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function monthName(m: number): string {
  return [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][m - 1] ?? String(m);
}

export function percent(numer: DecimalLike, denom: DecimalLike): number {
  const n = toNumber(numer);
  const d = toNumber(denom);
  if (d === 0) return 0;
  return Math.round((n / d) * 1000) / 10;
}

export function utilizationColor(pct: number): 'green' | 'yellow' | 'red' {
  if (pct > 100) return 'red';
  if (pct >= 80) return 'yellow';
  return 'green';
}
