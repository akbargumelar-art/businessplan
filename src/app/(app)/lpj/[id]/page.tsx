import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin, canApproveLpj } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { formatIDR, formatDate, toNumber } from '@/lib/format';
import { submitLpj, reviewLpj, approveLpj, rejectLpj } from '@/server/actions/lpj';

export default async function LpjDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lpjId = Number(id);
  const user = await requireUser();

  const lpj = await prisma.lpj.findUnique({
    where: { id: lpjId },
    include: {
      items: true,
      proposal: { include: { allocation: { include: { category: true, period: true } }, createdBy: true } },
      createdBy: true,
    },
  });
  if (!lpj) notFound();

  const audits = await prisma.auditLog.findMany({
    where: { entityType: 'lpj', entityId: lpjId },
    include: { actor: { select: { name: true } } },
    orderBy: { atTimestamp: 'desc' },
    take: 20,
  });

  const isCreator = lpj.createdById === user.id;
  const canEdit = (lpj.status === 'draft' || lpj.status === 'rejected') && (isCreator || isAdmin(user.role));
  const canSubmit = lpj.status === 'draft' && (isCreator || isAdmin(user.role));
  const canReview = lpj.status === 'submitted' && canApproveLpj(user.role, 'supervisor');
  const canApprove = (lpj.status === 'supervisor_reviewed' || lpj.status === 'submitted') && canApproveLpj(user.role, 'admin');
  const canReject = (lpj.status === 'submitted' || lpj.status === 'supervisor_reviewed') && canApproveLpj(user.role, 'supervisor');

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={`LPJ: ${lpj.proposal.title}`}
        description={lpj.proposal.number ?? '-'}
        actions={
          <>
            <StatusBadge status={lpj.status} />
            {canEdit && <Link href={`/lpj/${lpjId}/edit`}><Button size="sm" variant="outline">Edit</Button></Link>}
            {canSubmit && (
              <form action={async () => { 'use server'; await submitLpj(lpjId); }} className="inline">
                <Button size="sm">Submit</Button>
              </form>
            )}
            {canReview && (
              <form action={async () => { 'use server'; await reviewLpj(lpjId); }} className="inline">
                <Button size="sm">Mark Reviewed</Button>
              </form>
            )}
            {canApprove && (
              <form action={async () => { 'use server'; await approveLpj(lpjId); }} className="inline">
                <Button size="sm" variant="success">Approve</Button>
              </form>
            )}
            <Link href={`/proposals/${lpj.proposalId}`}><Button size="sm" variant="ghost">Lihat Proposal</Button></Link>
          </>
        }
      />

      {lpj.rejectionNote && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <div className="font-medium">Ditolak:</div>
          <div>{lpj.rejectionNote}</div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <SumCard label="Total Proposal" value={toNumber(lpj.proposal.totalBudget)} />
        <SumCard label="Total Realisasi" value={toNumber(lpj.totalRealized)} accent="blue" />
        <SumCard label="Selisih" value={toNumber(lpj.variance)} accent={toNumber(lpj.variance) < 0 ? 'red' : 'green'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Realisasi per Item</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <Tr>
                    <Th>Item</Th>
                    <Th className="text-right w-16">Qty</Th>
                    <Th className="text-right w-36">Harga</Th>
                    <Th className="text-right w-36">Total</Th>
                  </Tr>
                </THead>
                <TBody>
                  {lpj.items.map((it) => (
                    <Tr key={it.id}>
                      <Td className="font-medium">{it.name}</Td>
                      <Td className="text-right">{it.qty}</Td>
                      <Td className="text-right">{formatIDR(it.unitPrice)}</Td>
                      <Td className="text-right">{formatIDR(it.total)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          {lpj.narrative && (
            <Card>
              <CardHeader><CardTitle>Narasi Pelaksanaan</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{lpj.narrative}</CardContent>
            </Card>
          )}

          {lpj.evaluation && (
            <Card>
              <CardHeader><CardTitle>Kendala & Evaluasi</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{lpj.evaluation}</CardContent>
            </Card>
          )}

          {canReject && (
            <Card>
              <CardHeader><CardTitle className="text-red-700">Reject LPJ</CardTitle></CardHeader>
              <CardContent>
                <form action={async (fd: FormData) => {
                  'use server';
                  const note = String(fd.get('note') ?? '');
                  await rejectLpj(lpjId, note);
                }} className="space-y-3">
                  <Textarea name="note" required minLength={5} placeholder="Alasan penolakan (wajib)" rows={3} />
                  <Button type="submit" variant="danger" size="sm">Reject</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Riwayat</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-2">
              {audits.length === 0 && <li className="text-slate-400">Belum ada aktivitas.</li>}
              {audits.map((a) => (
                <li key={a.id} className="flex items-start gap-2 border-l-2 border-slate-200 pl-3">
                  <div>
                    <div className="font-medium">{a.action}</div>
                    <div className="text-xs text-slate-500">
                      {a.actor?.name ?? 'system'} · {formatDate(a.atTimestamp)}
                    </div>
                    {a.note && <div className="text-xs text-slate-600 mt-0.5">{a.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SumCard({ label, value, accent }: { label: string; value: number; accent?: 'blue' | 'green' | 'red' }) {
  const color = accent === 'blue' ? 'text-blue-700'
              : accent === 'green' ? 'text-green-700'
              : accent === 'red' ? 'text-red-700' : 'text-slate-800';
  return (
    <Card>
      <CardContent>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`mt-1 text-lg font-semibold ${color}`}>{formatIDR(value)}</div>
      </CardContent>
    </Card>
  );
}
