import { NextRequest } from 'next/server';
import { createElement, type ReactElement } from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { canViewOwnedBy, requireUser } from '@/lib/permissions';
import { ProposalPdf } from '@/components/pdf/proposal-pdf';
import { getOrgSettings } from '@/lib/org';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const [proposal, org] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id: Number(id) },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        attachments: true,
        allocation: { include: { category: true, period: true } },
        createdBy: { select: { name: true, email: true, signatureImagePath: true, supervisorId: true } },
      },
    }),
    getOrgSettings(),
  ]);
  if (!proposal) return new Response('Not found', { status: 404 });
  if (!canViewOwnedBy(user, proposal.createdById, proposal.createdBy.supervisorId)) {
    return new Response('Not found', { status: 404 });
  }

  const attachmentBase = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const element = createElement(ProposalPdf, { proposal, org, attachmentBase }) as unknown as ReactElement<DocumentProps>;
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
