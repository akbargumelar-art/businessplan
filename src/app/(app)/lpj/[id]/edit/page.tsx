import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { LpjForm } from '@/components/lpj-form';
import { updateLpj } from '@/server/actions/lpj';
import { toNumber } from '@/lib/format';

export default async function EditLpjPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lpjId = Number(id);
  const user = await requireUser();

  const lpj = await prisma.lpj.findUnique({
    where: { id: lpjId },
    include: { items: true, proposal: true },
  });
  if (!lpj) notFound();
  if (lpj.status !== 'draft' && lpj.status !== 'rejected') redirect(`/lpj/${lpjId}`);
  if (lpj.createdById !== user.id && !isAdmin(user.role)) redirect(`/lpj/${lpjId}`);

  async function action(formData: FormData) {
    'use server';
    await updateLpj(lpjId, formData);
    redirect(`/lpj/${lpjId}`);
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Edit LPJ"
        description={lpj.proposal.title}
        actions={<Link href={`/lpj/${lpjId}`}><Button variant="ghost">Kembali</Button></Link>}
      />
      <LpjForm
        action={action}
        proposalId={lpj.proposalId}
        proposalTotal={toNumber(lpj.proposal.totalBudget)}
        initialNarrative={lpj.narrative}
        initialEvaluation={lpj.evaluation}
        initialItems={lpj.items.map((i) => ({
          proposalItemId: i.proposalItemId,
          name: i.name,
          qty: i.qty,
          unitPrice: toNumber(i.unitPrice),
        }))}
        submitLabel="Update LPJ"
      />
    </div>
  );
}
