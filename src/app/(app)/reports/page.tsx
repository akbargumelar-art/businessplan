import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { formatIDR, percent, toNumber } from '@/lib/format';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();

  const periods = await prisma.budgetPeriod.findMany({
    where: { year },
    orderBy: { month: 'asc' },
    include: { allocations: { include: { category: true } } },
  });

  const visibility = proposalVisibilityWhere({ userId: user.id, role: user.role });

  const categories = await prisma.budgetCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const allAllocations = periods.flatMap((p) => p.allocations);
  const byCategory = categories.map((c) => {
    const allocated = allAllocations
      .filter((a) => a.categoryId === c.id)
      .reduce((s, a) => s + toNumber(a.allocatedAmount), 0);
    return { id: c.id, name: c.name, allocated };
  });

  const lpjsThisYear = await prisma.lpj.findMany({
    where: {
      status: 'admin_approved',
      proposal: { allocation: { period: { year } }, ...visibility },
    },
    include: { proposal: { include: { allocation: true } } },
  });

  const proposalsThisYear = await prisma.proposal.findMany({
    where: { status: 'final', allocation: { period: { year } }, ...visibility },
    select: { allocationId: true, totalBudget: true, allocation: { select: { categoryId: true } } },
  });

  const committedByCat = new Map<number, number>();
  for (const p of proposalsThisYear) {
    committedByCat.set(p.allocation.categoryId, (committedByCat.get(p.allocation.categoryId) ?? 0) + toNumber(p.totalBudget));
  }
  const absorbedByCat = new Map<number, number>();
  for (const l of lpjsThisYear) {
    const cid = l.proposal.allocation.categoryId;
    absorbedByCat.set(cid, (absorbedByCat.get(cid) ?? 0) + toNumber(l.totalRealized));
  }

  const yearlyTotals = byCategory.reduce(
    (acc, c) => {
      const committed = committedByCat.get(c.id) ?? 0;
      const absorbed = absorbedByCat.get(c.id) ?? 0;
      return {
        allocated: acc.allocated + c.allocated,
        committed: acc.committed + committed,
        absorbed: acc.absorbed + absorbed,
      };
    },
    { allocated: 0, committed: 0, absorbed: 0 },
  );

  const recentProposals = await prisma.proposal.findMany({
    where: { ...visibility, allocation: { period: { year } } },
    include: {
      allocation: { include: { category: true, period: true } },
      lpj: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const catColumns: Column[] = [
    { key: 'name', label: 'Kategori' },
    { key: 'allocated', label: 'Allocated', align: 'right' },
    { key: 'committed', label: 'Committed', align: 'right' },
    { key: 'absorbed', label: 'Absorbed', align: 'right' },
    { key: 'available', label: 'Available', align: 'right' },
    { key: 'utilization', label: '% Penyerapan', align: 'right' },
  ];

  const catRows: Row[] = byCategory.map((c) => {
    const committed = committedByCat.get(c.id) ?? 0;
    const absorbed = absorbedByCat.get(c.id) ?? 0;
    const available = c.allocated - committed;
    const util = percent(absorbed, c.allocated);
    return {
      key: c.id,
      values: { name: c.name, allocated: c.allocated, committed, absorbed, available, utilization: util },
      cells: {
        name: <span className="font-medium">{c.name}</span>,
        allocated: formatIDR(c.allocated),
        committed: formatIDR(committed),
        absorbed: formatIDR(absorbed),
        available: formatIDR(available),
        utilization: `${util}%`,
      },
    };
  });

  const propColumns: Column[] = [
    { key: 'number', label: 'Nomor' },
    { key: 'title', label: 'Judul' },
    { key: 'creator', label: 'Pembuat' },
    { key: 'period', label: 'Periode' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'lpj', label: 'LPJ' },
  ];

  const propRows: Row[] = recentProposals.map((p) => ({
    key: p.id,
    values: {
      number: p.number ?? '',
      title: p.title,
      creator: p.createdBy.name,
      period: p.allocation.period.name,
      total: toNumber(p.totalBudget),
      status: p.status,
      lpj: p.lpj?.status ?? '',
    },
    cells: {
      number: <span className="font-mono text-xs">{p.number ?? '-'}</span>,
      title: <Link href={`/proposals/${p.id}`} className="font-medium hover:text-blue-700 hover:underline">{p.title}</Link>,
      creator: p.createdBy.name,
      period: p.allocation.period.name,
      total: formatIDR(p.totalBudget),
      status: <StatusBadge status={p.status} />,
      lpj: p.lpj ? <StatusBadge status={p.lpj.status} /> : <span className="text-xs text-slate-400">—</span>,
    },
  }));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Reports" description={`Ringkasan budget tahun ${year}`} />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <SumCard label="Total Allocated" value={yearlyTotals.allocated} accent="blue" />
        <SumCard label="Total Committed" value={yearlyTotals.committed} accent="purple" />
        <SumCard
          label="Total Absorbed"
          value={yearlyTotals.absorbed}
          accent="green"
          sub={`${percent(yearlyTotals.absorbed, yearlyTotals.allocated)}% dari alokasi tahunan`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Per Kategori</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="p-4">
            <DataTable columns={catColumns} rows={catRows} emptyMessage="Belum ada kategori." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Proposal Tahun {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="p-4">
            <DataTable columns={propColumns} rows={propRows} emptyMessage="Tidak ada proposal di tahun ini." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SumCard({ label, value, accent, sub }: {
  label: string;
  value: number;
  accent: 'blue' | 'purple' | 'green';
  sub?: string;
}) {
  const color = accent === 'blue' ? 'text-blue-700'
              : accent === 'purple' ? 'text-purple-700'
              : 'text-green-700';
  return (
    <Card>
      <CardContent>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-base font-semibold ${color}`}>{formatIDR(value)}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
