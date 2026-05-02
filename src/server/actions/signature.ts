'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { saveUpload, deleteUpload } from '@/lib/upload';
import { logAudit } from '@/lib/audit';

const dataUrlSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,/, 'Invalid signature data URL'),
});

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');

export async function saveDrawnSignature(formData: FormData) {
  const user = await requireUser();
  const parsed = dataUrlSchema.parse({ dataUrl: formData.get('dataUrl') });

  const match = parsed.dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!match) throw new Error('Format signature invalid');
  const [, ext, b64] = match;
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > 2 * 1024 * 1024) throw new Error('Signature terlalu besar (max 2MB)');

  const dir = path.join(UPLOAD_ROOT, 'signatures');
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buf);
  const publicPath = `/uploads/signatures/${filename}`;

  // Cleanup old signature
  const before = await prisma.user.findUnique({ where: { id: user.id } });
  if (before?.signatureImagePath) {
    await deleteUpload(before.signatureImagePath);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { signatureImagePath: publicPath },
  });

  await logAudit({ entity: 'user', entityId: user.id, action: 'signature:save', actorId: user.id });
  revalidatePath('/profile');
}

export async function uploadSignatureFile(formData: FormData) {
  const user = await requireUser();
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) throw new Error('File tidak valid');

  const saved = await saveUpload(file, 'signatures');

  const before = await prisma.user.findUnique({ where: { id: user.id } });
  if (before?.signatureImagePath) {
    await deleteUpload(before.signatureImagePath);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { signatureImagePath: saved.filePath },
  });

  await logAudit({ entity: 'user', entityId: user.id, action: 'signature:upload', actorId: user.id });
  revalidatePath('/profile');
}

export async function deleteSignature() {
  const user = await requireUser();
  const before = await prisma.user.findUnique({ where: { id: user.id } });
  if (before?.signatureImagePath) {
    await deleteUpload(before.signatureImagePath);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { signatureImagePath: null },
  });
  await logAudit({ entity: 'user', entityId: user.id, action: 'signature:delete', actorId: user.id });
  revalidatePath('/profile');
}
