import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { LpjForm } from '@/components/lpj-form';
import { createLpj } from '@/server/actions/lpj';
import { toNumber } from '@/lib/format';

export default async function NewLpjPage({
  searchParams,
}: {
  searchParams: Promise<{ proposalId?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const proposalId = Number(sp.proposalId);
  if (!proposalId) redirect('/proposals');

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { items: { orderBy: { sortOrder: 'asc' } }, lpj: true },
  });
  if (!proposal) notFound();
  if (proposal.status !== 'final') redirect(`/proposals/${proposalId}`);
  if (proposal.lpj) redirect(`/lpj/${proposal.lpj.id}`);
  if (proposal.createdById !== user.id && !isAdmin(user.role)) redirect(`/proposals/${proposalId}`);

  const initialItems = proposal.items.map((i) => ({
    proposalItemId: i.id,
    name: i.name,
    qty: i.qty,
    unitPrice: toNumber(i.unitPrice),
  }));

  return (
    <div className="w-full">
      <PageHeader
        title="Buat LPJ"
        description={`Untuk proposal: ${proposal.title}`}
        actions={<Link href={`/proposals/${proposalId}`}><Button variant="ghost">Kembali</Button></Link>}
      />
      <LpjForm
        action={createLpj}
        proposalId={proposalId}
        proposalTotal={toNumber(proposal.totalBudget)}
        initialItems={initialItems}
      />
    </div>
  );
}
