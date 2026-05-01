'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin, canApproveReallocation } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { getAvailableForAllocation } from '@/lib/budget';
import { toNumber } from '@/lib/format';

const schema = z.object({
  type: z.enum(['transfer', 'topup', 'reversal']).default('transfer'),
  sourceAllocationId: z.coerce.number().int().positive(),
  targetAllocationId: z.coerce.number().int().positive().optional().nullable(),
  amount: z.coerce.number().positive(),
  reason: z.string().min(5).max(2000),
  effectiveDate: z.coerce.date(),
  relatedProposalId: z.coerce.number().int().positive().optional().nullable(),
});

export async function createReallocation(formData: FormData) {
  const user = await requireUser();
  const data = schema.parse({
    type: formData.get('type') || 'transfer',
    sourceAllocationId: formData.get('sourceAllocationId'),
    targetAllocationId: formData.get('targetAllocationId') || null,
    amount: formData.get('amount'),
    reason: formData.get('reason'),
    effectiveDate: formData.get('effectiveDate') || new Date(),
    relatedProposalId: formData.get('relatedProposalId') || null,
  });

  if (data.type === 'transfer' && !data.targetAllocationId) {
    throw new Error('Transfer wajib pilih alokasi target');
  }

  if (data.type === 'transfer') {
    const available = await getAvailableForAllocation(data.sourceAllocationId);
    if (data.amount > available) {
      throw new Error(`Jumlah transfer (${data.amount.toLocaleString('id-ID')}) melebihi sisa alokasi sumber (${available.toLocaleString('id-ID')})`);
    }
  }

  const created = await prisma.budgetReallocation.create({
    data: {
      type: data.type,
      sourceAllocationId: data.sourceAllocationId,
      targetAllocationId: data.targetAllocationId ?? null,
      amount: data.amount,
      reason: data.reason,
      effectiveDate: data.effectiveDate,
      relatedProposalId: data.relatedProposalId ?? null,
      requestedById: user.id,
      status: 'draft',
    },
  });
  await logAudit({ entity: 'reallocation', entityId: created.id, action: 'create', actorId: user.id });
  redirect(`/reallocations/${created.id}`);
}

export async function submitReallocation(id: number) {
  const user = await requireUser();
  const r = await prisma.budgetReallocation.findUniqueOrThrow({ where: { id } });
  if (r.status !== 'draft') throw new Error('Hanya draft yang bisa submit');
  if (r.requestedById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');
  await prisma.budgetReallocation.update({
    where: { id }, data: { status: 'submitted' },
  });
  await logAudit({ entity: 'reallocation', entityId: id, action: 'submit', actorId: user.id });
  revalidatePath(`/reallocations/${id}`);
  revalidatePath('/reallocations');
}

export async function reviewReallocation(id: number) {
  const user = await requireUser();
  if (!canApproveReallocation(user.role, 'supervisor')) throw new Error('Forbidden');
  const r = await prisma.budgetReallocation.findUniqueOrThrow({ where: { id } });
  if (r.status !== 'submitted') throw new Error('Status tidak valid');
  await prisma.budgetReallocation.update({
    where: { id }, data: { status: 'supervisor_reviewed', reviewedAt: new Date() },
  });
  await logAudit({ entity: 'reallocation', entityId: id, action: 'review', actorId: user.id });
  revalidatePath(`/reallocations/${id}`);
}

export async function approveReallocation(id: number) {
  const user = await requireUser();
  if (!canApproveReallocation(user.role, 'admin')) throw new Error('Forbidden');

  await prisma.$transaction(async (tx) => {
    const r = await tx.budgetReallocation.findUniqueOrThrow({ where: { id } });
    if (r.status !== 'submitted' && r.status !== 'supervisor_reviewed') {
      throw new Error('Status tidak valid untuk approve');
    }
    const source = await tx.budgetAllocation.findUniqueOrThrow({ where: { id: r.sourceAllocationId } });
    const target = r.targetAllocationId
      ? await tx.budgetAllocation.findUniqueOrThrow({ where: { id: r.targetAllocationId } })
      : null;

    const before = {
      source: { id: source.id, allocated: toNumber(source.allocatedAmount) },
      target: target ? { id: target.id, allocated: toNumber(target.allocatedAmount) } : null,
    };

    const amount = toNumber(r.amount);

    if (r.type === 'transfer' && target) {
      await tx.budgetAllocation.update({
        where: { id: source.id },
        data: { allocatedAmount: { decrement: amount } },
      });
      await tx.budgetAllocation.update({
        where: { id: target.id },
        data: { allocatedAmount: { increment: amount } },
      });
    } else if (r.type === 'topup' && target) {
      await tx.budgetAllocation.update({
        where: { id: target.id },
        data: { allocatedAmount: { increment: amount } },
      });
    } else if (r.type === 'reversal') {
      // reverse: kembalikan dana ke source (minus operasi sebelumnya)
      await tx.budgetAllocation.update({
        where: { id: source.id },
        data: { allocatedAmount: { increment: amount } },
      });
      if (target) {
        await tx.budgetAllocation.update({
          where: { id: target.id },
          data: { allocatedAmount: { decrement: amount } },
        });
      }
    }

    const newSource = await tx.budgetAllocation.findUniqueOrThrow({ where: { id: source.id } });
    const newTarget = target ? await tx.budgetAllocation.findUniqueOrThrow({ where: { id: target.id } }) : null;

    const after = {
      source: { id: newSource.id, allocated: toNumber(newSource.allocatedAmount) },
      target: newTarget ? { id: newTarget.id, allocated: toNumber(newTarget.allocatedAmount) } : null,
    };

    await tx.budgetReallocation.update({
      where: { id },
      data: {
        status: 'admin_approved',
        approvedAt: new Date(),
        snapshotBefore: JSON.stringify(before),
        snapshotAfter: JSON.stringify(after),
      },
    });
    await logAudit({ entity: 'reallocation', entityId: id, action: 'approve', actorId: user.id, before, after, tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath(`/reallocations/${id}`);
  revalidatePath('/reallocations');
  revalidatePath('/dashboard');
  revalidatePath('/budget/periods');
}

export async function rejectReallocation(id: number, note: string) {
  const user = await requireUser();
  if (!canApproveReallocation(user.role, 'supervisor')) throw new Error('Forbidden');
  if (!note || note.length < 5) throw new Error('Alasan reject minimal 5 karakter');
  await prisma.budgetReallocation.update({
    where: { id }, data: { status: 'rejected', rejectionNote: note },
  });
  await logAudit({ entity: 'reallocation', entityId: id, action: 'reject', actorId: user.id, note });
  revalidatePath(`/reallocations/${id}`);
}
