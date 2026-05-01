import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { formatIDR, formatDate } from '@/lib/format';

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
    take: 50,
  });

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

      {lpjs.length === 0 ? (
        <EmptyState>Belum ada LPJ.</EmptyState>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Proposal</Th>
              <Th>Pembuat</Th>
              <Th>Periode/Kategori</Th>
              <Th className="text-right">Total Proposal</Th>
              <Th className="text-right">Realisasi</Th>
              <Th className="text-right">Selisih</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </THead>
          <TBody>
            {lpjs.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <div className="font-medium">{l.proposal.title}</div>
                  <div className="text-xs font-mono text-slate-500">{l.proposal.number ?? '-'}</div>
                </Td>
                <Td>{l.createdBy.name}</Td>
                <Td>
                  <div>{l.proposal.allocation.period.name}</div>
                  <div className="text-xs text-slate-500">{l.proposal.allocation.category.name}</div>
                </Td>
                <Td className="text-right">{formatIDR(l.proposal.totalBudget)}</Td>
                <Td className="text-right">{formatIDR(l.totalRealized)}</Td>
                <Td className={`text-right ${Number(l.variance) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {formatIDR(l.variance)}
                </Td>
                <Td><StatusBadge status={l.status} /></Td>
                <Td><Link href={`/lpj/${l.id}`}><Button size="sm" variant="outline">Detail</Button></Link></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
