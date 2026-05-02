import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser, canApproveLpj, canApproveReallocation } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { getPeriodSummary } from '@/lib/budget';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/input';
import { CategoryBarChart, CategoryDonut } from '@/components/dashboard-charts';
import { formatIDR, percent } from '@/lib/format';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const periods = await prisma.budgetPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 12,
  });

  if (periods.length === 0) {
    return (
      <div className="w-full">
        <PageHeader title="Dashboard" />
        <EmptyState>
          Belum ada periode budget. <Link href="/budget/periods" className="text-blue-700 hover:underline">Buat periode pertama</Link> dulu.
        </EmptyState>
      </div>
    );
  }

  const activePeriod = periods.find((p) => p.status === 'active') ?? periods[0];
  const periodId = sp.periodId ? Number(sp.periodId) : activePeriod.id;
  const period = await prisma.budgetPeriod.findUnique({ where: { id: periodId } });
  if (!period) return <div>Periode tidak ditemukan</div>;

  const { allocations, totals } = await getPeriodSummary(periodId);
  const utilization = percent(totals.absorbed, totals.allocated);

  const chartData = allocations.map((a) => ({
    name: a.category.name,
    allocated: a.stats.allocated,
    committed: a.stats.committed,
    absorbed: a.stats.absorbed,
  }));

  const donutData = allocations
    .filter((a) => a.stats.allocated > 0)
    .map((a) => ({ name: a.category.name, value: a.stats.allocated }));

  const visibilityWhere = proposalVisibilityWhere({ userId: user.id, role: user.role });

  const recentProposals = await prisma.proposal.findMany({
    where: visibilityWhere,
    include: { allocation: { include: { category: true, period: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const pendingLpj = canApproveLpj(user.role, 'supervisor')
    ? await prisma.lpj.findMany({
        where: { status: { in: ['submitted', 'supervisor_reviewed'] } },
        include: { proposal: true },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      })
    : [];

  const pendingReallocations = canApproveReallocation(user.role, 'supervisor')
    ? await prisma.budgetReallocation.findMany({
        where: { status: { in: ['submitted', 'supervisor_reviewed'] } },
        include: {
          sourceAllocation: { include: { category: true } },
          targetAllocation: { include: { category: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    : [];

  return (
    <div className="w-full">
      <PageHeader
        title="Dashboard"
        description={`Periode ${period.name}`}
        actions={
          <form method="GET" className="flex gap-2 items-center">
            <Select name="periodId" defaultValue={periodId} onChange={undefined}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Button type="submit" variant="outline" size="sm">Filter</Button>
          </form>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Allocated" value={totals.allocated} accent="blue" />
        <Stat label="Committed" value={totals.committed} accent="purple" />
        <Stat label="Absorbed" value={totals.absorbed} accent="green" sub={`${utilization}% terserap`} />
        <Stat label="Available" value={totals.available} accent={totals.available < 0 ? 'red' : 'gray'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Alokasi vs Penyerapan per Kategori</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState>Belum ada alokasi di periode ini.</EmptyState>
            ) : (
              <CategoryBarChart data={chartData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Komposisi Alokasi</CardTitle></CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <EmptyState>Belum ada data.</EmptyState>
            ) : (
              <CategoryDonut data={donutData} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Detail Penyerapan per Kategori</CardTitle></CardHeader>
        <CardContent className="p-0">
          {allocations.length === 0 ? (
            <div className="p-5"><EmptyState>Belum ada alokasi.</EmptyState></div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Kategori</Th>
                  <Th className="text-right">Allocated</Th>
                  <Th className="text-right">Committed</Th>
                  <Th className="text-right">Absorbed</Th>
                  <Th className="text-right">Available</Th>
                  <Th className="w-48">Penyerapan</Th>
                </Tr>
              </THead>
              <TBody>
                {allocations.map((a) => (
                  <Tr key={a.id}>
                    <Td className="font-medium">{a.category.name}{a.department && <span className="text-xs text-slate-500"> · {a.department}</span>}</Td>
                    <Td className="text-right">{formatIDR(a.stats.allocated)}</Td>
                    <Td className="text-right">{formatIDR(a.stats.committed)}</Td>
                    <Td className="text-right">{formatIDR(a.stats.absorbed)}</Td>
                    <Td className={`text-right ${a.stats.available < 0 ? 'text-red-600 font-medium' : ''}`}>{formatIDR(a.stats.available)}</Td>
                    <Td>
                      <Progress value={a.stats.absorbed} max={a.stats.allocated || 1} />
                      <div className="text-xs text-slate-500 mt-0.5">{a.stats.utilization}%</div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Proposal Terbaru</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-200">
              {recentProposals.length === 0 && <li className="p-4 text-sm text-slate-500">Belum ada.</li>}
              {recentProposals.map((p) => (
                <li key={p.id} className="p-4">
                  <Link href={`/proposals/${p.id}`} className="block hover:bg-slate-50 -m-1 p-1 rounded">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{p.title}</div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                      <span>{p.number ?? '—'}</span>
                      <span>{formatIDR(p.totalBudget)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {canApproveLpj(user.role, 'supervisor') && (
          <Card>
            <CardHeader><CardTitle>LPJ Menunggu Review</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-200">
                {pendingLpj.length === 0 && <li className="p-4 text-sm text-slate-500">Tidak ada.</li>}
                {pendingLpj.map((l) => (
                  <li key={l.id} className="p-4">
                    <Link href={`/lpj/${l.id}`} className="block hover:bg-slate-50 -m-1 p-1 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{l.proposal.title}</div>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Realisasi: {formatIDR(l.totalRealized)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {canApproveReallocation(user.role, 'supervisor') && (
          <Card>
            <CardHeader><CardTitle>Reallocation Pending</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-200">
                {pendingReallocations.length === 0 && <li className="p-4 text-sm text-slate-500">Tidak ada.</li>}
                {pendingReallocations.map((r) => (
                  <li key={r.id} className="p-4">
                    <Link href={`/reallocations/${r.id}`} className="block hover:bg-slate-50 -m-1 p-1 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Badge variant={r.type === 'reversal' ? 'red' : r.type === 'topup' ? 'green' : 'blue'}>{r.type}</Badge>{' '}
                          <span className="font-medium">{formatIDR(r.amount)}</span>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {r.sourceAllocation.category.name} → {r.targetAllocation?.category.name ?? '-'}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, sub }: {
  label: string;
  value: number;
  accent: 'blue' | 'green' | 'purple' | 'red' | 'gray';
  sub?: string;
}) {
  const color = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    red: 'text-red-700',
    gray: 'text-slate-700',
  }[accent];
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
