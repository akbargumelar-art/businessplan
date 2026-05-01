import Link from 'next/link';
import { requireUser } from '@/lib/permissions';
import { listAvailableAllocations } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/proposal-form';
import { createProposal } from '@/server/actions/proposals';
import { EmptyState } from '@/components/ui/table';

export default async function NewProposalPage() {
  await requireUser();
  const allocations = await listAvailableAllocations();

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Proposal Baru"
        description="Isi form lengkap. Akan tersimpan sebagai draft, finalize untuk dapat nomor."
        actions={<Link href="/proposals"><Button variant="ghost">Kembali</Button></Link>}
      />
      {allocations.length === 0 ? (
        <EmptyState>
          Tidak ada alokasi aktif. Minta admin/supervisor membuat alokasi periode aktif dulu.
        </EmptyState>
      ) : (
        <ProposalForm action={createProposal} allocations={allocations} />
      )}
    </div>
  );
}
