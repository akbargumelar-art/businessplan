import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { proposalVisibilityWhere } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/table';
import { formatDate } from '@/lib/format';

export default async function DocumentationPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const visibility = proposalVisibilityWhere({ userId: user.id, role: user.role });

  const proposalAttachments = await prisma.proposalAttachment.findMany({
    where: { proposal: visibility },
    include: { proposal: { select: { id: true, title: true, number: true } }, uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  const lpjAttachments = await prisma.lpjAttachment.findMany({
    where: {
      lpj: { proposal: visibility },
      ...(sp.type && ['receipt', 'documentation'].includes(sp.type) ? { type: sp.type as 'receipt' | 'documentation' } : {}),
    },
    include: {
      lpj: { include: { proposal: { select: { id: true, title: true, number: true } } } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  type Item = {
    key: string;
    filePath: string;
    fileType: string;
    label: string | null;
    type: string;
    proposal: { id: number; title: string; number: string | null };
    uploadedBy: string;
    createdAt: Date;
  };

  const items: Item[] = [
    ...proposalAttachments.map((a) => ({
      key: `p${a.id}`, filePath: a.filePath, fileType: a.fileType, label: a.label,
      type: 'plan',
      proposal: a.proposal, uploadedBy: a.uploadedBy.name, createdAt: a.createdAt,
    })),
    ...lpjAttachments.map((a) => ({
      key: `l${a.id}`, filePath: a.filePath, fileType: a.fileType, label: a.label,
      type: a.type,
      proposal: a.lpj.proposal, uploadedBy: a.uploadedBy.name, createdAt: a.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Documentation" description="Arsip foto kegiatan, nota, dan dokumentasi rencana." />

      <Card className="mb-4">
        <CardContent>
          <form className="flex gap-3 items-end" method="GET">
            <div className="w-52">
              <label className="text-xs text-slate-600">Tipe</label>
              <Select name="type" defaultValue={sp.type ?? ''}>
                <option value="">Semua</option>
                <option value="documentation">Dokumentasi</option>
                <option value="receipt">Nota / Kuitansi</option>
              </Select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState>Belum ada dokumentasi terupload.</EmptyState>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it) => {
            const isImage = it.fileType.startsWith('image/');
            return (
              <a key={it.key} href={it.filePath} target="_blank" rel="noreferrer" className="group">
                <div className="aspect-square rounded-md border border-slate-200 bg-slate-100 overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.filePath} alt={it.label ?? 'doc'} className="h-full w-full object-cover group-hover:opacity-90" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500 p-3 text-center">
                      📄<br />{it.fileType}
                    </div>
                  )}
                </div>
                <div className="mt-1.5">
                  <Badge variant={it.type === 'receipt' ? 'yellow' : it.type === 'documentation' ? 'blue' : 'gray'}>{it.type}</Badge>
                </div>
                <div className="text-xs text-slate-700 truncate mt-1">{it.proposal.title}</div>
                <div className="text-xs text-slate-400">{it.uploadedBy} · {formatDate(it.createdAt)}</div>
                <Link href={`/proposals/${it.proposal.id}`} className="text-xs text-blue-700 hover:underline">→ proposal</Link>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
