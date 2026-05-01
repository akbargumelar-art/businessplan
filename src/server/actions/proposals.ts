'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { nextProposalNumber } from '@/lib/numbering';
import { getAvailableForAllocation } from '@/lib/budget';
import { toNumber } from '@/lib/format';

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});

const proposalSchema = z.object({
  title: z.string().min(3).max(200),
  objective: z.string().max(2000).optional().nullable(),
  goal: z.string().max(2000).optional().nullable(),
  allocationId: z.coerce.number().int().positive(),
  eventStartDate: z.coerce.date(),
  eventEndDate: z.coerce.date(),
  items: z.array(itemSchema).min(1, 'Minimal 1 item'),
});

function parseFromForm(formData: FormData) {
  const itemsRaw = formData.get('items');
  let items: unknown = [];
  if (typeof itemsRaw === 'string' && itemsRaw.length) {
    try { items = JSON.parse(itemsRaw); } catch { items = []; }
  }
  return proposalSchema.parse({
    title: formData.get('title'),
    objective: (formData.get('objective') as string) || null,
    goal: (formData.get('goal') as string) || null,
    allocationId: formData.get('allocationId'),
    eventStartDate: formData.get('eventStartDate'),
    eventEndDate: formData.get('eventEndDate'),
    items,
  });
}

export async function createProposal(formData: FormData) {
  const user = await requireUser();
  const data = parseFromForm(formData);

  const total = data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const created = await prisma.proposal.create({
    data: {
      title: data.title,
      objective: data.objective,
      goal: data.goal,
      allocationId: data.allocationId,
      totalBudget: total,
      eventStartDate: data.eventStartDate,
      eventEndDate: data.eventEndDate,
      status: 'draft',
      createdById: user.id,
      items: {
        create: data.items.map((i, idx) => ({
          name: i.name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          total: i.qty * i.unitPrice,
          sortOrder: idx,
        })),
      },
    },
  });

  await logAudit({ entity: 'proposal', entityId: created.id, action: 'create', actorId: user.id, after: created });
  redirect(`/proposals/${created.id}`);
}

export async function updateProposal(id: number, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.proposal.findUniqueOrThrow({
    where: { id }, include: { items: true },
  });
  if (existing.status !== 'draft') throw new Error('Hanya draft yang bisa di-edit');
  if (existing.createdById !== user.id && !isAdmin(user.role)) {
    throw new Error('Forbidden');
  }

  const data = parseFromForm(formData);
  const total = data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.proposalItem.deleteMany({ where: { proposalId: id } });
    return tx.proposal.update({
      where: { id },
      data: {
        title: data.title,
        objective: data.objective,
        goal: data.goal,
        allocationId: data.allocationId,
        totalBudget: total,
        eventStartDate: data.eventStartDate,
        eventEndDate: data.eventEndDate,
        items: {
          create: data.items.map((i, idx) => ({
            name: i.name, qty: i.qty, unitPrice: i.unitPrice,
            total: i.qty * i.unitPrice, sortOrder: idx,
          })),
        },
      },
    });
  });

  await logAudit({ entity: 'proposal', entityId: id, action: 'update', actorId: user.id, before: existing, after: updated });
  revalidatePath(`/proposals/${id}`);
}

export async function finalizeProposal(id: number) {
  const user = await requireUser();
  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id }, include: { allocation: { include: { category: true, period: true } } },
  });
  if (proposal.status !== 'draft') throw new Error('Hanya draft yang bisa difinalisasi');
  if (proposal.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');
  if (proposal.allocation.status !== 'active') throw new Error('Alokasi tidak aktif');

  const available = await getAvailableForAllocation(proposal.allocationId, id);
  if (toNumber(proposal.totalBudget) > available) {
    throw new Error(
      `Total proposal (${toNumber(proposal.totalBudget).toLocaleString('id-ID')}) melebihi sisa alokasi (${available.toLocaleString('id-ID')}). ` +
      `Silakan ajukan reallocation atau revisi total.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const number = await nextProposalNumber({
      tx,
      tokens: { TPL: proposal.allocation.category.code.slice(0, 6).toUpperCase() },
    });
    await tx.proposal.update({
      where: { id },
      data: { status: 'final', number, finalizedAt: new Date() },
    });
    await logAudit({
      entity: 'proposal', entityId: id, action: 'finalize', actorId: user.id,
      before: { status: 'draft' }, after: { status: 'final', number }, tx,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath('/proposals');
  revalidatePath(`/proposals/${id}`);
}

export async function cancelProposal(id: number, reason: string) {
  const user = await requireUser();
  const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id } });
  if (proposal.status === 'cancelled') return;
  if (!isAdmin(user.role) && proposal.createdById !== user.id) throw new Error('Forbidden');

  await prisma.proposal.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
  });
  await logAudit({ entity: 'proposal', entityId: id, action: 'cancel', actorId: user.id, note: reason });
  revalidatePath('/proposals');
  revalidatePath(`/proposals/${id}`);
}
