import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, Input } from '@/components/ui/input';
import { formatIDR, formatDate } from '@/lib/format';

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
    take: 50,
  });

  return (
    <div className="max-w-6xl mx-auto">
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

      {proposals.length === 0 ? (
        <EmptyState>Belum ada proposal yang cocok filter.</EmptyState>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Nomor</Th>
              <Th>Judul</Th>
              <Th>Pembuat</Th>
              <Th>Periode / Kategori</Th>
              <Th>Pelaksanaan</Th>
              <Th className="text-right">Total</Th>
              <Th>Status</Th>
              <Th>LPJ</Th>
              <Th></Th>
            </Tr>
          </THead>
          <TBody>
            {proposals.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-xs">{p.number ?? '-'}</Td>
                <Td className="font-medium">{p.title}</Td>
                <Td>{p.createdBy.name}</Td>
                <Td>
                  <div>{p.allocation.period.name}</div>
                  <div className="text-xs text-slate-500">{p.allocation.category.name}</div>
                </Td>
                <Td>{formatDate(p.eventStartDate)}</Td>
                <Td className="text-right">{formatIDR(p.totalBudget)}</Td>
                <Td><StatusBadge status={p.status} /></Td>
                <Td>{p.lpj ? <StatusBadge status={p.lpj.status} /> : <span className="text-xs text-slate-400">—</span>}</Td>
                <Td><Link href={`/proposals/${p.id}`}><Button size="sm" variant="outline">Detail</Button></Link></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
