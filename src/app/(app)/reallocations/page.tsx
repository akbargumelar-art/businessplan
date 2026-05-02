import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { formatIDR, formatDate, toNumber } from '@/lib/format';

export default async function ReallocationsPage() {
  const user = await requireUser();

  const where = user.role === 'admin' || user.role === 'supervisor'
    ? {}
    : { requestedById: user.id };

  const list = await prisma.budgetReallocation.findMany({
    where,
    include: {
      sourceAllocation: { include: { category: true, period: true } },
      targetAllocation: { include: { category: true, period: true } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const columns: Column[] = [
    { key: 'type', label: 'Tipe' },
    { key: 'source', label: 'Sumber' },
    { key: 'target', label: 'Target' },
    { key: 'amount', label: 'Jumlah', align: 'right' },
    { key: 'requestedBy', label: 'Pemohon' },
    { key: 'effectiveDate', label: 'Tanggal Efektif' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', sortable: false },
  ];

  const rows: Row[] = list.map((r) => ({
    key: r.id,
    values: {
      type: r.type,
      source: r.sourceAllocation.category.name,
      target: r.targetAllocation?.category.name ?? '',
      amount: toNumber(r.amount),
      requestedBy: r.requestedBy.name,
      effectiveDate: r.effectiveDate,
      status: r.status,
    },
    cells: {
      type: <Badge variant={r.type === 'reversal' ? 'red' : r.type === 'topup' ? 'green' : 'blue'}>{r.type}</Badge>,
      source: (
        <div>
          <div className="font-medium">{r.sourceAllocation.category.name}</div>
          <div className="text-xs text-slate-500">{r.sourceAllocation.period.name}</div>
        </div>
      ),
      target: r.targetAllocation ? (
        <div>
          <div className="font-medium">{r.targetAllocation.category.name}</div>
          <div className="text-xs text-slate-500">{r.targetAllocation.period.name}</div>
        </div>
      ) : <span className="text-slate-400">—</span>,
      amount: formatIDR(r.amount),
      requestedBy: r.requestedBy.name,
      effectiveDate: formatDate(r.effectiveDate),
      status: <StatusBadge status={r.status} />,
      actions: <Link href={`/reallocations/${r.id}`}><Button size="sm" variant="outline">Detail</Button></Link>,
    },
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Reallocation"
        description="Pengalihan dana antar alokasi (under-absorbed → program lain, top-up, reversal)."
        actions={<Link href="/reallocations/new"><Button>+ Reallocation Baru</Button></Link>}
      />
      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage="Belum ada reallocation."
        defaultSort={{ key: 'effectiveDate', dir: 'desc' }}
      />
    </div>
  );
}
