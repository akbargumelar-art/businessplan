import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin, canApproveReallocation } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { formatIDR, formatDate } from '@/lib/format';
import { submitReallocation, reviewReallocation, approveReallocation, rejectReallocation } from '@/server/actions/reallocations';

export default async function ReallocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rid = Number(id);
  const user = await requireUser();

  const r = await prisma.budgetReallocation.findUnique({
    where: { id: rid },
    include: {
      sourceAllocation: { include: { category: true, period: true } },
      targetAllocation: { include: { category: true, period: true } },
      requestedBy: true,
      relatedProposal: true,
    },
  });
  if (!r) notFound();

  const isOwner = r.requestedById === user.id;
  const canSubmit = r.status === 'draft' && (isOwner || isAdmin(user.role));
  const canReview = r.status === 'submitted' && canApproveReallocation(user.role, 'supervisor');
  const canApprove = (r.status === 'supervisor_reviewed' || r.status === 'submitted') && canApproveReallocation(user.role, 'admin');
  const canReject = (r.status === 'submitted' || r.status === 'supervisor_reviewed') && canApproveReallocation(user.role, 'supervisor');

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={`Reallocation #${r.id}`}
        description={<Badge variant={r.type === 'reversal' ? 'red' : r.type === 'topup' ? 'green' : 'blue'}>{r.type}</Badge>}
        actions={
          <>
            <StatusBadge status={r.status} />
            {canSubmit && (
              <form action={async () => { 'use server'; await submitReallocation(rid); }} className="inline">
                <Button size="sm">Submit</Button>
              </form>
            )}
            {canReview && (
              <form action={async () => { 'use server'; await reviewReallocation(rid); }} className="inline">
                <Button size="sm">Mark Reviewed</Button>
              </form>
            )}
            {canApprove && (
              <form action={async () => { 'use server'; await approveReallocation(rid); }} className="inline">
                <Button size="sm" variant="success">Approve</Button>
              </form>
            )}
            <Link href="/reallocations"><Button size="sm" variant="ghost">Kembali</Button></Link>
          </>
        }
      />

      {r.rejectionNote && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <div className="font-medium">Ditolak:</div><div>{r.rejectionNote}</div>
        </div>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle>Detail</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Jumlah" value={<span className="text-lg font-semibold text-blue-700">{formatIDR(r.amount)}</span>} />
          <Row label="Sumber" value={`${r.sourceAllocation.period.name} • ${r.sourceAllocation.category.name}`} />
          <Row label="Target" value={r.targetAllocation ? `${r.targetAllocation.period.name} • ${r.targetAllocation.category.name}` : '-'} />
          <Row label="Tanggal Efektif" value={formatDate(r.effectiveDate)} />
          <Row label="Pemohon" value={r.requestedBy.name} />
          <Row label="Alasan" value={<span className="whitespace-pre-wrap">{r.reason}</span>} />
          {r.relatedProposal && (
            <Row label="Proposal Terkait" value={
              <Link href={`/proposals/${r.relatedProposal.id}`} className="text-blue-700 hover:underline">
                {r.relatedProposal.number ?? `#${r.relatedProposal.id}`} — {r.relatedProposal.title}
              </Link>
            } />
          )}
        </CardContent>
      </Card>

      {r.snapshotBefore && r.snapshotAfter && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Snapshot Eksekusi</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto">
              {JSON.stringify({
                before: safeParseJson(r.snapshotBefore),
                after: safeParseJson(r.snapshotAfter),
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {canReject && (
        <Card>
          <CardHeader><CardTitle className="text-red-700">Reject</CardTitle></CardHeader>
          <CardContent>
            <form action={async (fd: FormData) => {
              'use server';
              const note = String(fd.get('note') ?? '');
              await rejectReallocation(rid, note);
            }} className="space-y-3">
              <Textarea name="note" required minLength={5} rows={3} placeholder="Alasan penolakan" />
              <Button type="submit" variant="danger" size="sm">Reject</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function safeParseJson(s: string | null): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}
