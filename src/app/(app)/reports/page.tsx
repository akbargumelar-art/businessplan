import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { formatIDR, formatDate, percent, toNumber } from '@/lib/format';

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
    include: {
      allocations: { include: { category: true } },
    },
  });

  const visibility = proposalVisibilityWhere({ userId: user.id, role: user.role });

  // Per category aggregate for the year
  const categories = await prisma.budgetCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const allAllocations = periods.flatMap((p) => p.allocations);
  const byCategory = categories.map((c) => {
    const allocated = allAllocations
      .filter((a) => a.categoryId === c.id)
      .reduce((s, a) => s + toNumber(a.allocatedAmount), 0);
    return { id: c.id, name: c.name, allocated };
  });

  // Get committed/absorbed per category
  const lpjsThisYear = await prisma.lpj.findMany({
    where: {
      status: 'admin_approved',
      proposal: { allocation: { period: { year } }, ...visibility },
    },
    include: { proposal: { include: { allocation: true } } },
  });

  const proposalsThisYear = await prisma.proposal.findMany({
    where: {
      status: 'final',
      allocation: { period: { year } },
      ...visibility,
    },
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
    (acc, c) => ({
      allocated: acc.allocated + c.allocated,
      committed: acc.committed + (committedByCat.get(c.id) ?? 0),
      absorbed: acc.absorbed + (absorbedByCat.get(c.id) ?? 0),
    }),
    { allocated: 0, committed: 0, absorbed: 0 },
  );

  const recentProposals = await prisma.proposal.findMany({
    where: { ...visibility, allocation: { period: { year } } },
    include: { allocation: { include: { category: true, period: true } }, lpj: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Reports" description={`Ringkasan budget tahun ${year}`} />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <SumCard label="Total Allocated" value={yearlyTotals.allocated} accent="blue" />
        <SumCard label="Total Committed" value={yearlyTotals.committed} accent="purple" />
        <SumCard label="Total Absorbed" value={yearlyTotals.absorbed} accent="green" sub={`${percent(yearlyTotals.absorbed, yearlyTotals.allocated)}% dari alokasi tahunan`} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Per Kategori</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <Tr>
                <Th>Kategori</Th>
                <Th className="text-right">Allocated</Th>
                <Th className="text-right">Committed</Th>
                <Th className="text-right">Absorbed</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">% Penyerapan</Th>
              </Tr>
            </THead>
            <TBody>
              {byCategory.map((c) => {
                const committed = committedByCat.get(c.id) ?? 0;
                const absorbed = absorbedByCat.get(c.id) ?? 0;
                return (
                  <Tr key={c.id}>
                    <Td className="font-medium">{c.name}</Td>
                    <Td className="text-right">{formatIDR(c.allocated)}</Td>
                    <Td className="text-right">{formatIDR(committed)}</Td>
                    <Td className="text-right">{formatIDR(absorbed)}</Td>
                    <Td className="text-right">{formatIDR(c.allocated - committed)}</Td>
                    <Td className="text-right">{percent(absorbed, c.allocated)}%</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daftar Proposal Tahun {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentProposals.length === 0 ? (
            <div className="p-5"><EmptyState>Tidak ada proposal di tahun ini.</EmptyState></div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Nomor</Th>
                  <Th>Judul</Th>
                  <Th>Pembuat</Th>
                  <Th>Periode</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th>LPJ</Th>
                </Tr>
              </THead>
              <TBody>
                {recentProposals.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs">{p.number ?? '-'}</Td>
                    <Td className="font-medium">{p.title}</Td>
                    <Td>{p.createdBy.name}</Td>
                    <Td>{p.allocation.period.name}</Td>
                    <Td className="text-right">{formatIDR(p.totalBudget)}</Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td>{p.lpj ? <StatusBadge status={p.lpj.status} /> : <span className="text-xs text-slate-400">—</span>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
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
        <div className={`mt-1 text-xl font-semibold ${color}`}>{formatIDR(value)}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
