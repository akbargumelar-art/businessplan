'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { saveUpload, deleteUpload } from '@/lib/upload';
import { logAudit } from '@/lib/audit';

const ATTACH_LABELS = ['KTP', 'Pass Photo', 'WoK', 'Dokumentasi Rencana', 'Lain-lain'] as const;
type AttachLabel = typeof ATTACH_LABELS[number];

export async function uploadProposalAttachment(formData: FormData) {
  const user = await requireUser();
  const proposalId = Number(formData.get('proposalId'));
  const label = String(formData.get('label') ?? 'Lain-lain') as AttachLabel;
  const file = formData.get('file') as File | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    throw new Error('File tidak valid');
  }
  if (!ATTACH_LABELS.includes(label)) {
    throw new Error(`Label tidak valid: ${label}`);
  }

  const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id: proposalId } });
  if (proposal.createdById !== user.id && !isAdmin(user.role)) {
    throw new Error('Forbidden');
  }

  const saved = await saveUpload(file, `proposals/${proposalId}`);

  // Replace existing attachment with same label (KTP/Pass Photo unique per proposal)
  if (label === 'KTP' || label === 'Pass Photo' || label === 'WoK') {
    const existing = await prisma.proposalAttachment.findFirst({
      where: { proposalId, label },
    });
    if (existing) {
      await deleteUpload(existing.filePath);
      await prisma.proposalAttachment.delete({ where: { id: existing.id } });
    }
  }

  const created = await prisma.proposalAttachment.create({
    data: {
      proposalId,
      filePath: saved.filePath,
      fileType: saved.fileType,
      label,
      uploadedById: user.id,
    },
  });

  await logAudit({
    entity: 'proposal', entityId: proposalId, action: `attach:${label}`, actorId: user.id,
    after: { id: created.id, filePath: created.filePath, label: created.label },
  });

  revalidatePath(`/proposals/${proposalId}`);
}

export async function deleteProposalAttachment(attachmentId: number) {
  const user = await requireUser();
  const att = await prisma.proposalAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { proposal: true },
  });
  if (att.proposal.createdById !== user.id && !isAdmin(user.role)) {
    throw new Error('Forbidden');
  }
  await deleteUpload(att.filePath);
  await prisma.proposalAttachment.delete({ where: { id: attachmentId } });
  await logAudit({
    entity: 'proposal', entityId: att.proposalId, action: `attach:delete:${att.label}`, actorId: user.id,
    before: { id: att.id, filePath: att.filePath, label: att.label },
  });
  revalidatePath(`/proposals/${att.proposalId}`);
}
