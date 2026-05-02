'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, isAdmin, canApproveLpj, canReviewOwnedBy } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { postLpjRealization } from '@/lib/budget';
import { notify, getNextLpjApprovers } from '@/lib/notify';

const itemSchema = z.object({
  proposalItemId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(200),
  qty: z.coerce.number().int().min(0),
  unitPrice: z.coerce.number().nonnegative(),
});

const lpjSchema = z.object({
  proposalId: z.coerce.number().int().positive(),
  narrative: z.string().max(5000).optional().nullable(),
  evaluation: z.string().max(3000).optional().nullable(),
  items: z.array(itemSchema).min(1),
});

function parseFromForm(formData: FormData) {
  let items: unknown = [];
  const itemsRaw = formData.get('items');
  if (typeof itemsRaw === 'string') {
    try { items = JSON.parse(itemsRaw); } catch { items = []; }
  }
  return lpjSchema.parse({
    proposalId: formData.get('proposalId'),
    narrative: (formData.get('narrative') as string) || null,
    evaluation: (formData.get('evaluation') as string) || null,
    items,
  });
}

export async function createLpj(formData: FormData) {
  const user = await requireUser();
  const data = parseFromForm(formData);

  const proposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: data.proposalId },
    include: { lpj: true },
  });
  if (proposal.lpj) throw new Error('LPJ untuk proposal ini sudah ada');
  if (proposal.status !== 'final') throw new Error('Hanya proposal final yang bisa di-LPJ-kan');
  if (proposal.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');

  const totalRealized = data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const variance = Number(proposal.totalBudget) - totalRealized;

  const created = await prisma.lpj.create({
    data: {
      proposalId: data.proposalId,
      narrative: data.narrative,
      evaluation: data.evaluation,
      totalRealized,
      variance,
      status: 'draft',
      createdById: user.id,
      items: {
        create: data.items.map((i) => ({
          name: i.name, qty: i.qty, unitPrice: i.unitPrice,
          total: i.qty * i.unitPrice,
          variance: 0,
          proposalItemId: i.proposalItemId ?? null,
        })),
      },
    },
  });
  await logAudit({ entity: 'lpj', entityId: created.id, action: 'create', actorId: user.id, after: created });
  redirect(`/lpj/${created.id}`);
}

export async function updateLpj(id: number, formData: FormData) {
  const user = await requireUser();
  const lpj = await prisma.lpj.findUniqueOrThrow({ where: { id } });
  if (lpj.status !== 'draft' && lpj.status !== 'rejected') throw new Error('Tidak bisa edit di status ini');
  if (lpj.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');

  const data = parseFromForm(formData);
  const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id: lpj.proposalId } });
  const totalRealized = data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const variance = Number(proposal.totalBudget) - totalRealized;

  await prisma.$transaction(async (tx) => {
    await tx.lpjItem.deleteMany({ where: { lpjId: id } });
    await tx.lpj.update({
      where: { id },
      data: {
        narrative: data.narrative,
        evaluation: data.evaluation,
        totalRealized,
        variance,
        status: 'draft', // reset ke draft kalau dari rejected
        rejectionNote: null,
        items: {
          create: data.items.map((i) => ({
            name: i.name, qty: i.qty, unitPrice: i.unitPrice,
            total: i.qty * i.unitPrice, variance: 0,
            proposalItemId: i.proposalItemId ?? null,
          })),
        },
      },
    });
  });
  await logAudit({ entity: 'lpj', entityId: id, action: 'update', actorId: user.id });
  revalidatePath(`/lpj/${id}`);
}

export async function submitLpj(id: number) {
  const user = await requireUser();
  const lpj = await prisma.lpj.findUniqueOrThrow({
    where: { id },
    include: { proposal: true, createdBy: { select: { name: true, supervisorId: true } } },
  });
  if (lpj.status !== 'draft') throw new Error('Hanya draft yang bisa submit');
  if (lpj.createdById !== user.id && !isAdmin(user.role)) throw new Error('Forbidden');
  await prisma.lpj.update({
    where: { id },
    data: { status: 'submitted', submittedAt: new Date() },
  });
  await logAudit({ entity: 'lpj', entityId: id, action: 'submit', actorId: user.id });

  const recipients = await getNextLpjApprovers('submitted', lpj.createdById);
  await notify({
    userIds: recipients,
    type: 'lpj.submitted',
    title: `LPJ menunggu review: ${lpj.proposal.title}`,
    body: `${lpj.createdBy.name} sudah submit LPJ untuk proposal "${lpj.proposal.title}". Silakan review.`,
    link: `/lpj/${id}`,
  });

  revalidatePath(`/lpj/${id}`);
  revalidatePath('/lpj');
}

export async function reviewLpj(id: number) {
  const user = await requireUser();
  if (!canApproveLpj(user.role, 'supervisor')) throw new Error('Forbidden');
  const lpj = await prisma.lpj.findUniqueOrThrow({
    where: { id },
    include: { proposal: true, createdBy: { select: { supervisorId: true } } },
  });
  if (!canReviewOwnedBy(user, lpj.createdById, lpj.createdBy.supervisorId)) throw new Error('Forbidden');
  if (lpj.status !== 'submitted') throw new Error('Hanya status submitted yang bisa di-review');
  await prisma.lpj.update({
    where: { id },
    data: { status: 'supervisor_reviewed', reviewedAt: new Date() },
  });
  await logAudit({ entity: 'lpj', entityId: id, action: 'review', actorId: user.id });

  const recipients = await getNextLpjApprovers('supervisor_reviewed', lpj.createdById);
  await notify({
    userIds: recipients,
    type: 'lpj.supervisor_reviewed',
    title: `LPJ menunggu approve admin: ${lpj.proposal.title}`,
    body: `Sudah di-review supervisor. Menunggu final approval dari admin.`,
    link: `/lpj/${id}`,
  });

  revalidatePath(`/lpj/${id}`);
  revalidatePath('/lpj');
}

export async function approveLpj(id: number) {
  const user = await requireUser();
  if (!canApproveLpj(user.role, 'admin')) throw new Error('Forbidden');
  const lpj = await prisma.lpj.findUniqueOrThrow({ where: { id } });
  if (lpj.status !== 'supervisor_reviewed' && lpj.status !== 'submitted') {
    throw new Error('Status tidak valid untuk approve');
  }

  await prisma.$transaction(async (tx) => {
    await tx.lpj.update({
      where: { id },
      data: { status: 'admin_approved', approvedAt: new Date() },
    });
    await postLpjRealization(tx, id);
    await logAudit({ entity: 'lpj', entityId: id, action: 'approve', actorId: user.id, tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const lpjFull = await prisma.lpj.findUniqueOrThrow({
    where: { id }, include: { proposal: true },
  });
  await notify({
    userIds: [lpjFull.createdById],
    type: 'lpj.approved',
    title: `LPJ approved: ${lpjFull.proposal.title}`,
    body: `LPJ Anda untuk proposal "${lpjFull.proposal.title}" sudah final-approved oleh admin. Realisasi sudah ter-post ke alokasi.`,
    link: `/lpj/${id}`,
  });

  revalidatePath(`/lpj/${id}`);
  revalidatePath('/lpj');
  revalidatePath('/dashboard');
}

export async function rejectLpj(id: number, note: string) {
  const user = await requireUser();
  if (!canApproveLpj(user.role, 'supervisor')) throw new Error('Forbidden');
  if (!note || note.length < 5) throw new Error('Alasan reject minimal 5 karakter');
  const lpj = await prisma.lpj.findUniqueOrThrow({
    where: { id },
    include: { proposal: true, createdBy: { select: { supervisorId: true } } },
  });
  if (!canReviewOwnedBy(user, lpj.createdById, lpj.createdBy.supervisorId)) throw new Error('Forbidden');
  await prisma.lpj.update({
    where: { id },
    data: { status: 'rejected', rejectionNote: note },
  });
  await logAudit({ entity: 'lpj', entityId: id, action: 'reject', actorId: user.id, note });

  await notify({
    userIds: [lpj.createdById],
    type: 'lpj.rejected',
    title: `LPJ ditolak: ${lpj.proposal.title}`,
    body: `Alasan: ${note}\n\nSilakan revisi dan submit ulang.`,
    link: `/lpj/${id}`,
  });

  revalidatePath(`/lpj/${id}`);
  revalidatePath('/lpj');
}
