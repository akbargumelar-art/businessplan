import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { formatIDR, formatDate } from '@/lib/format';

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
    take: 50,
  });

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Reallocation"
        description="Pengalihan dana antar alokasi (under-absorbed → program lain, top-up, reversal)."
        actions={<Link href="/reallocations/new"><Button>+ Reallocation Baru</Button></Link>}
      />

      {list.length === 0 ? (
        <EmptyState>Belum ada reallocation.</EmptyState>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Tipe</Th>
              <Th>Sumber</Th>
              <Th>Target</Th>
              <Th className="text-right">Jumlah</Th>
              <Th>Pemohon</Th>
              <Th>Tanggal Efektif</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </THead>
          <TBody>
            {list.map((r) => (
              <Tr key={r.id}>
                <Td><Badge variant={r.type === 'reversal' ? 'red' : r.type === 'topup' ? 'green' : 'blue'}>{r.type}</Badge></Td>
                <Td>
                  <div className="font-medium">{r.sourceAllocation.category.name}</div>
                  <div className="text-xs text-slate-500">{r.sourceAllocation.period.name}</div>
                </Td>
                <Td>
                  {r.targetAllocation ? (
                    <>
                      <div className="font-medium">{r.targetAllocation.category.name}</div>
                      <div className="text-xs text-slate-500">{r.targetAllocation.period.name}</div>
                    </>
                  ) : <span className="text-slate-400">—</span>}
                </Td>
                <Td className="text-right">{formatIDR(r.amount)}</Td>
                <Td>{r.requestedBy.name}</Td>
                <Td>{formatDate(r.effectiveDate)}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td><Link href={`/reallocations/${r.id}`}><Button size="sm" variant="outline">Detail</Button></Link></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
