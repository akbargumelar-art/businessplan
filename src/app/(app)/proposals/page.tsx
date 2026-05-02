import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, Input } from '@/components/ui/input';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { formatIDR, formatDate, toNumber } from '@/lib/format';

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const where: Record<string, unknown> = {
    ...proposalVisibilityWhere({ userId: user.id, role: user.role }),
  };
  if (sp.status && ['draft', 'final', 'cancelled'].includes(sp.status)) {
    where.status = sp.status;
  }
  if (sp.q) {
    where.title = { contains: sp.q };
  }

  const proposals = await prisma.proposal.findMany({
    where,
    include: {
      allocation: { include: { category: true, period: true } },
      createdBy: { select: { name: true } },
      lpj: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const columns: Column[] = [
    { key: 'number', label: 'Nomor', width: 'w-40' },
    { key: 'title', label: 'Judul' },
    { key: 'creator', label: 'Pembuat' },
    { key: 'period', label: 'Periode / Kategori' },
    { key: 'event', label: 'Pelaksanaan' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'lpj', label: 'LPJ' },
    { key: 'actions', label: '', sortable: false },
  ];

  const rows: Row[] = proposals.map((p) => ({
    key: p.id,
    values: {
      number: p.number ?? '',
      title: p.title,
      creator: p.createdBy.name,
      period: p.allocation.period.name,
      event: p.eventStartDate,
      total: toNumber(p.totalBudget),
      status: p.status,
      lpj: p.lpj?.status ?? '',
    },
    cells: {
      number: <span className="font-mono text-xs">{p.number ?? '-'}</span>,
      title: (
        <Link href={`/proposals/${p.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
          {p.title}
        </Link>
      ),
      creator: p.createdBy.name,
      period: (
        <div>
          <div>{p.allocation.period.name}</div>
          <div className="text-xs text-slate-500">{p.allocation.category.name}</div>
        </div>
      ),
      event: formatDate(p.eventStartDate),
      total: formatIDR(p.totalBudget),
      status: <StatusBadge status={p.status} />,
      lpj: p.lpj ? <StatusBadge status={p.lpj.status} /> : <span className="text-xs text-slate-400">—</span>,
      actions: <Link href={`/proposals/${p.id}`}><Button size="sm" variant="outline">Detail</Button></Link>,
    },
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Proposal"
        description="Daftar proposal pengajuan budget."
        actions={
          <Link href="/proposals/new"><Button>+ Proposal Baru</Button></Link>
        }
      />

      <Card className="mb-4">
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end" method="GET">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-600">Cari Judul</label>
              <Input name="q" defaultValue={sp.q ?? ''} placeholder="Promo HUT..." />
            </div>
            <div className="w-44">
              <label className="text-xs text-slate-600">Status</label>
              <Select name="status" defaultValue={sp.status ?? ''}>
                <option value="">Semua</option>
                <option value="draft">Draft</option>
                <option value="final">Final</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        emptyMessage="Belum ada proposal yang cocok filter."
        defaultSort={{ key: 'event', dir: 'desc' }}
      />
    </div>
  );
}
