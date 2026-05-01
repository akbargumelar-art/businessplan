import { NextRequest } from 'next/server';
import { createElement, type ReactElement } from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { ProposalPdf } from '@/components/pdf/proposal-pdf';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id: Number(id) },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      allocation: { include: { category: true, period: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!proposal) return new Response('Not found', { status: 404 });

  const element = createElement(ProposalPdf, { proposal }) as unknown as ReactElement<DocumentProps>;
  const buf = await renderToBuffer(element);
  const filename = `${(proposal.number ?? `draft-${proposal.id}`).replace(/[\/\\]/g, '-')}.pdf`;

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
