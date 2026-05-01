'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, 'Hanya huruf, angka, _ atau -'),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function createCategory(formData: FormData) {
  const user = await requireRole('admin');
  const parsed = schema.parse({
    code: formData.get('code'),
    name: formData.get('name'),
    description: formData.get('description') || null,
    active: formData.get('active') === 'on',
    sortOrder: formData.get('sortOrder') || 0,
  });

  const created = await prisma.budgetCategory.create({ data: parsed });
  await logAudit({ entity: 'category', entityId: created.id, action: 'create', actorId: user.id, after: created });
  revalidatePath('/budget/categories');
}

export async function updateCategory(id: number, formData: FormData) {
  const user = await requireRole('admin');
  const parsed = schema.parse({
    code: formData.get('code'),
    name: formData.get('name'),
    description: formData.get('description') || null,
    active: formData.get('active') === 'on',
    sortOrder: formData.get('sortOrder') || 0,
  });
  const before = await prisma.budgetCategory.findUnique({ where: { id } });
  const updated = await prisma.budgetCategory.update({ where: { id }, data: parsed });
  await logAudit({ entity: 'category', entityId: id, action: 'update', actorId: user.id, before, after: updated });
  revalidatePath('/budget/categories');
}

export async function toggleCategory(id: number) {
  const user = await requireRole('admin');
  const cat = await prisma.budgetCategory.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.budgetCategory.update({
    where: { id },
    data: { active: !cat.active },
  });
  await logAudit({ entity: 'category', entityId: id, action: 'toggle', actorId: user.id, before: cat, after: updated });
  revalidatePath('/budget/categories');
}
