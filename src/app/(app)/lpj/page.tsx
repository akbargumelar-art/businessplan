import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { formatIDR, toNumber } from '@/lib/format';

export default async function LpjListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const proposalWhere = proposalVisibilityWhere({ userId: user.id, role: user.role });
  const where: Record<string, unknown> = { proposal: proposalWhere };
  if (sp.status) where.status = sp.status;

  const lpjs = await prisma.lpj.findMany({
    where,
    include: {
      proposal: { include: { allocation: { include: { category: true, period: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const columns: Column[] = [
    { key: 'proposal', label: 'Proposal' },
    { key: 'creator', label: 'Pembuat' },
    { key: 'period', label: 'Periode/Kategori' },
    { key: 'totalProposal', label: 'Total Proposal', align: 'right' },
    { key: 'realized', label: 'Realisasi', align: 'right' },
    { key: 'variance', label: 'Selisih', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', sortable: false },
  ];

  const rows: Row[] = lpjs.map((l) => ({
    key: l.id,
    values: {
      proposal: l.proposal.title,
      creator: l.createdBy.name,
      period: l.proposal.allocation.period.name,
      totalProposal: toNumber(l.proposal.totalBudget),
      realized: toNumber(l.totalRealized),
      variance: toNumber(l.variance),
      status: l.status,
    },
    cells: {
      proposal: (
        <div>
          <Link href={`/lpj/${l.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
            {l.proposal.title}
          </Link>
          <div className="text-xs font-mono text-slate-500">{l.proposal.number ?? '-'}</div>
        </div>
      ),
      creator: l.createdBy.name,
      period: (
        <div>
          <div>{l.proposal.allocation.period.name}</div>
          <div className="text-xs text-slate-500">{l.proposal.allocation.category.name}</div>
        </div>
      ),
      totalProposal: formatIDR(l.proposal.totalBudget),
      realized: formatIDR(l.totalRealized),
      variance: (
        <span className={toNumber(l.variance) < 0 ? 'text-red-600' : 'text-green-700'}>{formatIDR(l.variance)}</span>
      ),
      status: <StatusBadge status={l.status} />,
      actions: <Link href={`/lpj/${l.id}`}><Button size="sm" variant="outline">Detail</Button></Link>,
    },
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Laporan Pertanggungjawaban (LPJ)" description="Daftar LPJ semua proposal yang sudah dieksekusi." />

      <Card className="mb-4">
        <CardContent>
          <form className="flex gap-3 items-end" method="GET">
            <div className="w-52">
              <label className="text-xs text-slate-600">Status</label>
              <Select name="status" defaultValue={sp.status ?? ''}>
                <option value="">Semua</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="supervisor_reviewed">Supervisor Reviewed</option>
                <option value="admin_approved">Admin Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <DataTable columns={columns} rows={rows} emptyMessage="Belum ada LPJ." />
    </div>
  );
}
