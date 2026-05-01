import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { getAvailableForAllocation } from '@/lib/budget';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, Input, Select, Textarea } from '@/components/ui/input';
import { formatIDR } from '@/lib/format';
import { createReallocation } from '@/server/actions/reallocations';

export default async function NewReallocationPage() {
  await requireUser();
  const allocations = await prisma.budgetAllocation.findMany({
    where: { period: { status: { in: ['planning', 'active'] } } },
    include: { category: true, period: true },
    orderBy: [{ period: { startDate: 'desc' } }, { category: { sortOrder: 'asc' } }],
  });
  const withAvail = await Promise.all(
    allocations.map(async (a) => ({
      id: a.id,
      label: `${a.period.name} • ${a.category.name}${a.department ? ` • ${a.department}` : ''}`,
      available: await getAvailableForAllocation(a.id),
    })),
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Reallocation Baru"
        description="Ajukan pengalihan dana antar alokasi. Transfer butuh sumber + target, top-up hanya butuh target."
        actions={<Link href="/reallocations"><Button variant="ghost">Kembali</Button></Link>}
      />
      <Card>
        <CardHeader><CardTitle>Form Pengajuan</CardTitle></CardHeader>
        <CardContent>
          <form action={createReallocation} className="space-y-4">
            <FormField label="Tipe" required>
              <Select name="type" required>
                <option value="transfer">Transfer (sumber → target)</option>
                <option value="topup">Top-up (tambah ke target)</option>
                <option value="reversal">Reversal (kembalikan)</option>
              </Select>
            </FormField>

            <FormField label="Alokasi Sumber" required hint="Untuk transfer/reversal: alokasi yang dananya dipotong">
              <Select name="sourceAllocationId" required>
                <option value="">— Pilih alokasi sumber —</option>
                {withAvail.map((a) => (
                  <option key={a.id} value={a.id}>{a.label} (sisa {formatIDR(a.available)})</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Alokasi Target" hint="Wajib untuk transfer & top-up">
              <Select name="targetAllocationId">
                <option value="">— Pilih alokasi target —</option>
                {withAvail.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Jumlah (IDR)" required>
              <Input name="amount" type="number" min={1} step={1000} required />
            </FormField>

            <FormField label="Tanggal Efektif" required>
              <Input name="effectiveDate" type="date" defaultValue={today} required />
            </FormField>

            <FormField label="Alasan" required hint="Min 5 karakter, jelaskan kenapa pengalihan ini perlu">
              <Textarea name="reason" rows={3} minLength={5} required />
            </FormField>

            <FormField label="Proposal Terkait (opsional)" hint="Isi ID proposal pencetus, jika ada">
              <Input name="relatedProposalId" type="number" min={1} />
            </FormField>

            <Button type="submit">Simpan & Submit untuk Review</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
