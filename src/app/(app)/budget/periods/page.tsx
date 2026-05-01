import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser, canManageBudget } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select } from '@/components/ui/input';
import { formatDate, formatIDR, monthName } from '@/lib/format';
import { createPeriod } from '@/server/actions/periods';
import { getPeriodSummary } from '@/lib/budget';

export default async function PeriodsPage() {
  const user = await requireUser();
  const canManage = canManageBudget(user.role);

  const periods = await prisma.budgetPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 24,
  });

  const summaries = await Promise.all(
    periods.map(async (p) => ({ id: p.id, totals: (await getPeriodSummary(p.id)).totals })),
  );
  const summaryMap = new Map(summaries.map((s) => [s.id, s.totals]));

  const now = new Date();

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Periode Budget"
        description="Kelola periode bulanan dan total alokasinya."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Periode</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {periods.length === 0 ? (
              <div className="p-5"><EmptyState>Belum ada periode.</EmptyState></div>
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Periode</Th>
                    <Th>Tanggal</Th>
                    <Th className="text-right">Allocated</Th>
                    <Th className="text-right">Committed</Th>
                    <Th className="text-right">Absorbed</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </Tr>
                </THead>
                <TBody>
                  {periods.map((p) => {
                    const totals = summaryMap.get(p.id);
                    return (
                      <Tr key={p.id}>
                        <Td className="font-medium">{p.name}</Td>
                        <Td className="text-slate-500">{formatDate(p.startDate)} – {formatDate(p.endDate)}</Td>
                        <Td className="text-right">{formatIDR(totals?.allocated ?? 0)}</Td>
                        <Td className="text-right">{formatIDR(totals?.committed ?? 0)}</Td>
                        <Td className="text-right">{formatIDR(totals?.absorbed ?? 0)}</Td>
                        <Td><StatusBadge status={p.status} /></Td>
                        <Td className="text-right">
                          <Link href={`/budget/periods/${p.id}`}>
                            <Button size="sm" variant="outline">Detail</Button>
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Buat Periode Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPeriod} className="space-y-4">
                <FormField label="Tahun" required>
                  <Input name="year" type="number" min={2020} max={2100} defaultValue={now.getFullYear()} required />
                </FormField>
                <FormField label="Bulan" required>
                  <Select name="month" defaultValue={now.getMonth() + 1} required>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Status" hint='Default "planning" — set "active" saat bulan berjalan'>
                  <Select name="status" defaultValue="planning">
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </Select>
                </FormField>
                <Button type="submit" className="w-full">Buat Periode</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
