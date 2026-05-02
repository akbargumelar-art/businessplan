'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { saveUpload, deleteUpload } from '@/lib/upload';
import { logAudit } from '@/lib/audit';

const TYPES = ['receipt', 'documentation', 'report'] as const;

const baseSchema = z.object({
  lpjId: z.coerce.number().int().positive(),
  type: z.enum(TYPES),
  label: z.string().max(200).optional().nullable(),
  itemRef: z.coerce.number().int().positive().optional().nullable(),
});

export async function uploadLpjAttachment(formData: FormData) {
  const user = await requireUser();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) throw new Error('File tidak valid');

  const data = baseSchema.parse({
    lpjId: formData.get('lpjId'),
    type: formData.get('type'),
    label: (formData.get('label') as string) || null,
    itemRef: formData.get('itemRef') || null,
  });

  const lpj = await prisma.lpj.findUniqueOrThrow({ where: { id: data.lpjId } });
  if (lpj.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');
  if (lpj.status !== 'draft' && lpj.status !== 'rejected') {
    throw new Error('Lampiran hanya bisa diubah saat LPJ masih draft atau rejected');
  }

  // "report" type accepts Office files (xlsx/docx/pptx) up to 10MB.
  const saved = await saveUpload(file, `lpj/${data.lpjId}`, {
    allowOffice: data.type === 'report',
    maxBytes: data.type === 'report' ? 10 * 1024 * 1024 : undefined,
  });

  const created = await prisma.lpjAttachment.create({
    data: {
      lpjId: data.lpjId,
      type: data.type,
      filePath: saved.filePath,
      fileType: saved.fileType,
      label: data.label,
      itemRef: data.itemRef ? String(data.itemRef) : null,
      uploadedById: user.id,
    },
  });

  // Auto-link receipt to lpj item if itemRef set
  if (data.type === 'receipt' && data.itemRef) {
    await prisma.lpjItem.updateMany({
      where: { id: data.itemRef, lpjId: data.lpjId },
      data: { receiptAttachmentId: created.id },
    });
  }

  await logAudit({
    entity: 'lpj', entityId: data.lpjId, action: `attach:${data.type}`, actorId: user.id,
    after: { id: created.id, type: data.type, label: data.label, itemRef: data.itemRef },
  });

  revalidatePath(`/lpj/${data.lpjId}`);
}

export async function deleteLpjAttachment(attachmentId: number) {
  const user = await requireUser();
  const att = await prisma.lpjAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { lpj: true },
  });
  if (att.lpj.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');
  if (att.lpj.status !== 'draft' && att.lpj.status !== 'rejected') {
    throw new Error('Lampiran hanya bisa diubah saat LPJ masih draft atau rejected');
  }

  // Unlink from items first
  await prisma.lpjItem.updateMany({
    where: { receiptAttachmentId: attachmentId },
    data: { receiptAttachmentId: null },
  });

  await deleteUpload(att.filePath);
  await prisma.lpjAttachment.delete({ where: { id: attachmentId } });
  await logAudit({
    entity: 'lpj', entityId: att.lpjId, action: `attach:delete:${att.type}`, actorId: user.id,
    before: { id: att.id, type: att.type, filePath: att.filePath },
  });
  revalidatePath(`/lpj/${att.lpjId}`);
}
