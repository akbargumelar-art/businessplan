import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser, canManageBudget } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select } from '@/components/ui/input';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
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

  const columns: Column[] = [
    { key: 'name', label: 'Periode' },
    { key: 'date', label: 'Tanggal' },
    { key: 'allocated', label: 'Allocated', align: 'right' },
    { key: 'committed', label: 'Committed', align: 'right' },
    { key: 'absorbed', label: 'Absorbed', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', sortable: false },
  ];

  const rows: Row[] = periods.map((p) => {
    const t = summaryMap.get(p.id);
    return {
      key: p.id,
      values: {
        name: p.name,
        date: p.startDate,
        allocated: t?.allocated ?? 0,
        committed: t?.committed ?? 0,
        absorbed: t?.absorbed ?? 0,
        status: p.status,
      },
      cells: {
        name: (
          <Link href={`/budget/periods/${p.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
            {p.name}
          </Link>
        ),
        date: <span className="text-slate-500">{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>,
        allocated: formatIDR(t?.allocated ?? 0),
        committed: formatIDR(t?.committed ?? 0),
        absorbed: formatIDR(t?.absorbed ?? 0),
        status: <StatusBadge status={p.status} />,
        actions: <Link href={`/budget/periods/${p.id}`}><Button size="sm" variant="outline">Detail</Button></Link>,
      },
    };
  });

  const now = new Date();

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Periode Budget"
        description="Kelola periode bulanan dan total alokasinya."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="Belum ada periode."
        />

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
