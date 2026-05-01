import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { listAvailableAllocations } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/proposal-form';
import { updateProposal } from '@/server/actions/proposals';
import { toNumber } from '@/lib/format';

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposalId = Number(id);
  const user = await requireUser();

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!proposal) notFound();
  if (proposal.status !== 'draft') redirect(`/proposals/${proposalId}`);
  if (proposal.createdById !== user.id && !isAdmin(user.role)) redirect(`/proposals/${proposalId}`);

  const allocations = await listAvailableAllocations();
  // include current allocation if not in active list
  if (!allocations.find((a) => a.id === proposal.allocationId)) {
    const cur = await prisma.budgetAllocation.findUnique({
      where: { id: proposal.allocationId },
      include: { category: true, period: true },
    });
    if (cur) {
      allocations.unshift({
        id: cur.id,
        label: `${cur.period.name} • ${cur.category.name}${cur.department ? ` • ${cur.department}` : ''}`,
        available: 0,
        category: cur.category.name,
        period: cur.period.name,
      });
    }
  }

  async function action(formData: FormData) {
    'use server';
    await updateProposal(proposalId, formData);
    redirect(`/proposals/${proposalId}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={`Edit: ${proposal.title}`}
        actions={<Link href={`/proposals/${proposalId}`}><Button variant="ghost">Kembali</Button></Link>}
      />
      <ProposalForm
        action={action}
        allocations={allocations}
        submitLabel="Update Draft"
        initial={{
          title: proposal.title,
          objective: proposal.objective,
          goal: proposal.goal,
          description: proposal.description,
          allocationId: proposal.allocationId,
          eventStartDate: proposal.eventStartDate.toISOString().slice(0, 10),
          eventEndDate: proposal.eventEndDate.toISOString().slice(0, 10),
          items: proposal.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            unitPrice: toNumber(i.unitPrice),
          })),
          kantor: proposal.kantor,
          gmClusterName: proposal.gmClusterName,
          programType: proposal.programType,
          usageNote: proposal.usageNote,
          productInfo: proposal.productInfo,
          applicantName: proposal.applicantName,
          applicantPhone: proposal.applicantPhone,
          applicantAddress: proposal.applicantAddress,
          signatureCity: proposal.signatureCity,
          approverName: proposal.approverName,
          approverTitle: proposal.approverTitle,
          witnessName: proposal.witnessName,
          witnessTitle: proposal.witnessTitle,
        }}
      />
    </div>
  );
}
