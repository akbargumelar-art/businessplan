'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { monthName } from '@/lib/format';

const schema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  status: z.enum(['planning', 'active', 'closed']).default('planning'),
});

export async function createPeriod(formData: FormData) {
  const user = await requireRole('admin', 'supervisor');
  const parsed = schema.parse({
    year: formData.get('year'),
    month: formData.get('month'),
    status: formData.get('status') || 'planning',
  });

  const start = new Date(Date.UTC(parsed.year, parsed.month - 1, 1));
  const end = new Date(Date.UTC(parsed.year, parsed.month, 0));
  const name = `${monthName(parsed.month)} ${parsed.year}`;

  const created = await prisma.budgetPeriod.create({
    data: {
      name,
      year: parsed.year,
      month: parsed.month,
      startDate: start,
      endDate: end,
      status: parsed.status,
      createdById: user.id,
    },
  });
  await logAudit({ entity: 'period', entityId: created.id, action: 'create', actorId: user.id, after: created });
  revalidatePath('/budget/periods');
}

export async function setPeriodStatus(id: number, status: 'planning' | 'active' | 'closed') {
  const user = await requireRole('admin', 'supervisor');
  const before = await prisma.budgetPeriod.findUnique({ where: { id } });
  const updated = await prisma.budgetPeriod.update({ where: { id }, data: { status } });
  await logAudit({ entity: 'period', entityId: id, action: `status:${status}`, actorId: user.id, before, after: updated });
  revalidatePath('/budget/periods');
  revalidatePath(`/budget/periods/${id}`);
}
