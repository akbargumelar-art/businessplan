import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin, canViewOwnedBy } from '@/lib/permissions';
import { toNumber, formatIDR, formatDate } from '@/lib/format';
import { getAvailableForAllocation } from '@/lib/budget';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { finalizeProposal, cancelProposal } from '@/server/actions/proposals';
import { AttachmentUpload } from '@/components/attachment-upload';

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposalId = Number(id);
  const user = await requireUser();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      allocation: { include: { category: true, period: true } },
      createdBy: { select: { name: true, email: true, supervisorId: true } },
      lpj: true,
      attachments: true,
    },
  });
  if (!proposal) notFound();
  if (!canViewOwnedBy(user, proposal.createdById, proposal.createdBy.supervisorId)) notFound();

  const canEdit = proposal.status === 'draft' && (proposal.createdById === user.id || isAdmin(user.role));
  const canFinalize = canEdit;
  const canCancel = proposal.status !== 'cancelled' && (proposal.createdById === user.id || isAdmin(user.role));
  const canCreateLpj = proposal.status === 'final' && !proposal.lpj && (proposal.createdById === user.id || isAdmin(user.role));

  const available = await getAvailableForAllocation(proposal.allocationId, proposalId);
  const overBudget = toNumber(proposal.totalBudget) > available;

  return (
    <div className="w-full">
      <PageHeader
        title={proposal.title}
        description={proposal.number ?? 'Belum bernomor (draft)'}
        actions={
          <>
            <StatusBadge status={proposal.status} />
            {canEdit && <Link href={`/proposals/${proposalId}/edit`}><Button size="sm" variant="outline">Edit</Button></Link>}
            {canFinalize && (
              <form action={async () => { 'use server'; await finalizeProposal(proposalId); }} className="inline">
                <Button size="sm" disabled={overBudget}>Finalize</Button>
              </form>
            )}
            {proposal.status === 'final' && (
              <Link href={`/proposals/${proposalId}/pdf`} target="_blank">
                <Button size="sm" variant="outline">Lihat PDF</Button>
              </Link>
            )}
            {canCreateLpj && (
              <Link href={`/lpj/new?proposalId=${proposalId}`}><Button size="sm">Buat LPJ</Button></Link>
            )}
            {proposal.lpj && (
              <Link href={`/lpj/${proposal.lpj.id}`}><Button size="sm" variant="outline">Lihat LPJ</Button></Link>
            )}
            {canCancel && (
              <CancelButton proposalId={proposalId} />
            )}
          </>
        }
      />

      {overBudget && proposal.status === 'draft' && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Total proposal ({formatIDR(proposal.totalBudget)}) melebihi sisa alokasi ({formatIDR(available)}).
          Finalize akan ditolak. Solusi: turunkan total ATAU ajukan reallocation.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informasi Kegiatan</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Pelaksanaan">
                {formatDate(proposal.eventStartDate)} – {formatDate(proposal.eventEndDate)}
              </Row>
              <Row label="Objective">{proposal.objective || '-'}</Row>
              <Row label="Goal">{proposal.goal || '-'}</Row>
              <Row label="Pembuat">{proposal.createdBy.name}</Row>
              {proposal.cancelReason && <Row label="Alasan dibatalkan">{proposal.cancelReason}</Row>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rincian Penyerapan</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <Tr>
                    <Th>Item</Th>
                    <Th className="text-right w-20">Qty</Th>
                    <Th className="text-right w-40">Harga</Th>
                    <Th className="text-right w-40">Total</Th>
                  </Tr>
                </THead>
                <TBody>
                  {proposal.items.map((it) => (
                    <Tr key={it.id}>
                      <Td className="font-medium">{it.name}</Td>
                      <Td className="text-right">{it.qty}</Td>
                      <Td className="text-right">{formatIDR(it.unitPrice)}</Td>
                      <Td className="text-right">{formatIDR(it.total)}</Td>
                    </Tr>
                  ))}
                  <Tr>
                    <Td colSpan={3} className="text-right font-semibold">TOTAL</Td>
                    <Td className="text-right font-semibold">{formatIDR(proposal.totalBudget)}</Td>
                  </Tr>
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lampiran (KTP, Pass Photo, WoK, dokumentasi)</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentUpload
                proposalId={proposalId}
                attachments={proposal.attachments.map((a) => ({
                  id: a.id, filePath: a.filePath, fileType: a.fileType, label: a.label,
                }))}
                canEdit={proposal.createdById === user.id || isAdmin(user.role)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Sumber Dana</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Periode">{proposal.allocation.period.name}</Row>
              <Row label="Kategori">{proposal.allocation.category.name}</Row>
              <Row label="Departemen">{proposal.allocation.department || '-'}</Row>
              <Row label="Sisa alokasi">
                <span className={available < 0 ? 'text-red-600 font-medium' : ''}>{formatIDR(available)}</span>
              </Row>
              <Link className="text-blue-700 text-sm hover:underline block pt-2" href={`/budget/periods/${proposal.allocation.periodId}`}>
                → Lihat alokasi periode
              </Link>
            </CardContent>
          </Card>

          {proposal.lpj && (
            <Card>
              <CardHeader><CardTitle>Status LPJ</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <StatusBadge status={proposal.lpj.status} />
                <Row label="Total Realisasi">{formatIDR(proposal.lpj.totalRealized)}</Row>
                <Row label="Selisih">
                  <span className={toNumber(proposal.lpj.variance) < 0 ? 'text-red-600' : 'text-green-700'}>
                    {formatIDR(proposal.lpj.variance)}
                  </span>
                </Row>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-2 text-slate-800">{children}</div>
    </div>
  );
}

function CancelButton({ proposalId }: { proposalId: number }) {
  return (
    <form action={async (fd: FormData) => {
      'use server';
      const reason = String(fd.get('reason') ?? '');
      if (!reason) return;
      await cancelProposal(proposalId, reason);
    }} className="inline">
      <input type="hidden" name="reason" value="Dibatalkan oleh pembuat" />
      <Button type="submit" size="sm" variant="ghost">Batalkan</Button>
    </form>
  );
}
