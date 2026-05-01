'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  periodId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive(),
  department: z.string().trim().max(50).optional().nullable(),
  allocatedAmount: z.coerce.number().nonnegative(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function createAllocation(formData: FormData) {
  const user = await requireRole('admin', 'supervisor');
  const parsed = schema.parse({
    periodId: formData.get('periodId'),
    categoryId: formData.get('categoryId'),
    department: (formData.get('department') as string) || null,
    allocatedAmount: formData.get('allocatedAmount'),
    notes: (formData.get('notes') as string) || null,
  });

  const created = await prisma.budgetAllocation.create({
    data: { ...parsed, createdById: user.id, department: parsed.department ?? null },
  });
  await logAudit({ entity: 'allocation', entityId: created.id, action: 'create', actorId: user.id, after: created });
  revalidatePath(`/budget/periods/${parsed.periodId}`);
}

const updateSchema = schema.partial({ periodId: true, categoryId: true, department: true });

export async function updateAllocation(id: number, formData: FormData) {
  const user = await requireRole('admin');
  const before = await prisma.budgetAllocation.findUniqueOrThrow({ where: { id } });
  const parsed = updateSchema.parse({
    allocatedAmount: formData.get('allocatedAmount'),
    notes: (formData.get('notes') as string) || null,
  });
  const updated = await prisma.budgetAllocation.update({
    where: { id },
    data: {
      allocatedAmount: parsed.allocatedAmount ?? before.allocatedAmount,
      notes: parsed.notes ?? before.notes,
    },
  });
  await logAudit({
    entity: 'allocation', entityId: id, action: 'update', actorId: user.id,
    before, after: updated, note: (formData.get('reason') as string) || undefined,
  });
  revalidatePath(`/budget/periods/${before.periodId}`);
}

export async function setAllocationStatus(id: number, status: 'active' | 'locked' | 'closed') {
  const user = await requireRole('admin', 'supervisor');
  const before = await prisma.budgetAllocation.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.budgetAllocation.update({ where: { id }, data: { status } });
  await logAudit({ entity: 'allocation', entityId: id, action: `status:${status}`, actorId: user.id, before, after: updated });
  revalidatePath(`/budget/periods/${before.periodId}`);
}

export async function deleteAllocation(id: number) {
  const user = await requireRole('admin');
  const before = await prisma.budgetAllocation.findUniqueOrThrow({ where: { id } });
  const proposalCount = await prisma.proposal.count({ where: { allocationId: id } });
  if (proposalCount > 0) {
    throw new Error('Tidak bisa hapus alokasi yang sudah dipakai proposal. Lock saja.');
  }
  await prisma.budgetAllocation.delete({ where: { id } });
  await logAudit({ entity: 'allocation', entityId: id, action: 'delete', actorId: user.id, before });
  revalidatePath(`/budget/periods/${before.periodId}`);
}
