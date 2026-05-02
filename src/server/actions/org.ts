'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { saveUpload, deleteUpload } from '@/lib/upload';

const SIGNATURE_SLOTS = ['approver', 'witness', 'vp', 'finDir'] as const;
type SignatureSlot = typeof SIGNATURE_SLOTS[number];

const SLOT_TO_FIELD: Record<SignatureSlot, 'approverSignaturePath' | 'witnessSignaturePath' | 'vpSignaturePath' | 'finDirSignaturePath'> = {
  approver: 'approverSignaturePath',
  witness: 'witnessSignaturePath',
  vp: 'vpSignaturePath',
  finDir: 'finDirSignaturePath',
};

export async function uploadOrgSignature(formData: FormData) {
  const me = await requireRole('admin');
  const slot = String(formData.get('slot') ?? '') as SignatureSlot;
  if (!SIGNATURE_SLOTS.includes(slot)) throw new Error('Slot tidak valid');
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) throw new Error('File tidak valid');

  const saved = await saveUpload(file, 'signatures');
  const field = SLOT_TO_FIELD[slot];

  const existing = await prisma.organizationSettings.findFirst();
  if (existing) {
    const oldPath = existing[field];
    if (oldPath) await deleteUpload(oldPath);
    await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { [field]: saved.filePath },
    });
  } else {
    await prisma.organizationSettings.create({
      data: {
        companyName: 'Company',
        brandLine1: 'PROPOSAL',
        brandLine2: 'KEGIATAN PERMOHONAN BUDGET',
        [field]: saved.filePath,
      },
    });
  }

  await logAudit({ entity: 'user', entityId: 0, action: `org_signature:${slot}`, actorId: me.id });
  revalidatePath('/admin/settings');
}

export async function deleteOrgSignature(slot: 'approver' | 'witness' | 'vp' | 'finDir') {
  const me = await requireRole('admin');
  const field = SLOT_TO_FIELD[slot];
  const existing = await prisma.organizationSettings.findFirst();
  if (existing && existing[field]) {
    await deleteUpload(existing[field] as string);
    await prisma.organizationSettings.update({
      where: { id: existing.id },
      data: { [field]: null },
    });
    await logAudit({ entity: 'user', entityId: 0, action: `org_signature:delete:${slot}`, actorId: me.id });
    revalidatePath('/admin/settings');
  }
}

const schema = z.object({
  companyName: z.string().min(1).max(200),
  brandLine1: z.string().min(1).max(200),
  brandLine2: z.string().min(1).max(200),
  brandLine3: z.string().max(200).optional().nullable(),
  logoText: z.string().max(100).optional().nullable(),
  defaultInstitution: z.string().max(300).optional().nullable(),
  defaultAddress: z.string().max(500).optional().nullable(),
  defaultPhone: z.string().max(100).optional().nullable(),
  vpName: z.string().max(100).optional().nullable(),
  vpTitle: z.string().max(100).optional().nullable(),
  finDirName: z.string().max(100).optional().nullable(),
  finDirTitle: z.string().max(100).optional().nullable(),
  defaultKantor: z.string().max(100).optional().nullable(),
  defaultGmCluster: z.string().max(100).optional().nullable(),
  defaultSignatureCity: z.string().max(100).optional().nullable(),
});

export async function updateOrgSettings(formData: FormData) {
  const me = await requireRole('admin');
  const get = (k: string) => (formData.get(k) as string) || null;
  const data = schema.parse({
    companyName: formData.get('companyName'),
    brandLine1: formData.get('brandLine1'),
    brandLine2: formData.get('brandLine2'),
    brandLine3: get('brandLine3'),
    logoText: get('logoText'),
    defaultInstitution: get('defaultInstitution'),
    defaultAddress: get('defaultAddress'),
    defaultPhone: get('defaultPhone'),
    vpName: get('vpName'),
    vpTitle: get('vpTitle'),
    finDirName: get('finDirName'),
    finDirTitle: get('finDirTitle'),
    defaultKantor: get('defaultKantor'),
    defaultGmCluster: get('defaultGmCluster'),
    defaultSignatureCity: get('defaultSignatureCity'),
  });

  const existing = await prisma.organizationSettings.findFirst();
  let updated;
  if (existing) {
    updated = await prisma.organizationSettings.update({ where: { id: existing.id }, data });
  } else {
    updated = await prisma.organizationSettings.create({ data });
  }
  await logAudit({ entity: 'user', entityId: 0, action: 'update_org_settings', actorId: me.id, before: existing, after: updated });
  revalidatePath('/admin/settings');
}
