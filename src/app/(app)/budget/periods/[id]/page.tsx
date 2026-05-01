import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, canManageBudget } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select, Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatIDR, formatDate, percent } from '@/lib/format';
import { getPeriodSummary } from '@/lib/budget';
import { createAllocation, setAllocationStatus } from '@/server/actions/allocations';
import { setPeriodStatus } from '@/server/actions/periods';

export default async function PeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const periodId = Number(id);
  const user = await requireUser();
  const canManage = canManageBudget(user.role);

  const period = await prisma.budgetPeriod.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  const { allocations, totals } = await getPeriodSummary(periodId);
  const categories = await prisma.budgetCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });

  const utilization = percent(totals.absorbed, totals.allocated);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={period.name}
        description={`${formatDate(period.startDate)} – ${formatDate(period.endDate)}`}
        actions={
          <>
            <StatusBadge status={period.status} />
            {canManage && period.status !== 'closed' && (
              <form action={async () => { 'use server'; await setPeriodStatus(periodId, period.status === 'planning' ? 'active' : 'closed'); }} className="inline">
                <Button size="sm" variant="outline">
                  {period.status === 'planning' ? 'Aktifkan' : 'Tutup Periode'}
                </Button>
              </form>
            )}
            <Link href="/budget/periods"><Button size="sm" variant="ghost">Kembali</Button></Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard label="Allocated" value={totals.allocated} accent="blue" />
        <SummaryCard label="Committed" value={totals.committed} accent="purple" />
        <SummaryCard label="Absorbed" value={totals.absorbed} accent="green" sub={`${utilization}% terserap`} />
        <SummaryCard label="Available" value={totals.available} accent={totals.available < 0 ? 'red' : 'gray'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Alokasi per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {allocations.length === 0 ? (
              <div className="p-5"><EmptyState>Belum ada alokasi. Tambahkan dari form di samping.</EmptyState></div>
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Kategori</Th>
                    <Th>Dept</Th>
                    <Th className="text-right">Allocated</Th>
                    <Th className="text-right">Committed</Th>
                    <Th className="text-right">Absorbed</Th>
                    <Th className="text-right">Available</Th>
                    <Th>Penyerapan</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </Tr>
                </THead>
                <TBody>
                  {allocations.map((a) => (
                    <Tr key={a.id}>
                      <Td className="font-medium">
                        {a.category.name}
                        <div className="text-xs text-slate-500 font-normal">{a.category.code}</div>
                      </Td>
                      <Td className="text-slate-600 text-xs">{a.department ?? '-'}</Td>
                      <Td className="text-right">{formatIDR(a.stats.allocated)}</Td>
                      <Td className="text-right">{formatIDR(a.stats.committed)}</Td>
                      <Td className="text-right">{formatIDR(a.stats.absorbed)}</Td>
                      <Td className={`text-right font-medium ${a.stats.available < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatIDR(a.stats.available)}
                      </Td>
                      <Td className="min-w-[140px]">
                        <Progress value={a.stats.absorbed} max={a.stats.allocated || 1} />
                        <div className="text-xs text-slate-500 mt-0.5">{a.stats.utilization}%</div>
                      </Td>
                      <Td><Badge variant={a.status === 'active' ? 'green' : a.status === 'locked' ? 'yellow' : 'gray'}>{a.status}</Badge></Td>
                      <Td className="text-right">
                        {canManage && a.status === 'active' && (
                          <form action={async () => { 'use server'; await setAllocationStatus(a.id, 'locked'); }} className="inline">
                            <Button size="sm" variant="ghost">Lock</Button>
                          </form>
                        )}
                        {canManage && a.status === 'locked' && (
                          <form action={async () => { 'use server'; await setAllocationStatus(a.id, 'active'); }} className="inline">
                            <Button size="sm" variant="ghost">Unlock</Button>
                          </form>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {canManage && period.status !== 'closed' && (
          <Card>
            <CardHeader><CardTitle>Tambah Alokasi</CardTitle></CardHeader>
            <CardContent>
              <form action={createAllocation} className="space-y-4">
                <input type="hidden" name="periodId" value={periodId} />
                <FormField label="Kategori" required>
                  <Select name="categoryId" required>
                    <option value="">— Pilih kategori —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Departemen" hint="Opsional, kosongkan untuk kategori umum">
                  <Input name="department" placeholder="Sales / Marketing / ..." />
                </FormField>
                <FormField label="Nilai Alokasi (IDR)" required>
                  <Input name="allocatedAmount" type="number" min={0} step={1000} required placeholder="10000000" />
                </FormField>
                <FormField label="Catatan">
                  <Textarea name="notes" rows={2} />
                </FormField>
                <Button type="submit" className="w-full">Tambah Alokasi</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, accent, sub,
}: {
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
        <div className={`mt-1 text-lg font-semibold ${color}`}>{formatIDR(value)}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
