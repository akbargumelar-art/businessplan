import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { toNumber } from './format';

export type AllocationStats = {
  allocationId: number;
  allocated: number;
  committed: number; // sum proposals final (not cancelled)
  absorbed: number; // sum LPJ admin_approved
  available: number; // allocated - committed
  utilization: number; // absorbed/allocated *100
};

export async function getAllocationStats(allocationId: number): Promise<AllocationStats> {
  const allocation = await prisma.budgetAllocation.findUniqueOrThrow({
    where: { id: allocationId },
  });

  const proposals = await prisma.proposal.findMany({
    where: {
      allocationId,
      status: 'final',
    },
    select: { id: true, totalBudget: true },
  });

  const lpjs = await prisma.lpj.findMany({
    where: {
      proposal: { allocationId },
      status: 'admin_approved',
    },
    select: { totalRealized: true },
  });

  const allocated = toNumber(allocation.allocatedAmount);
  const committed = proposals.reduce((s, p) => s + toNumber(p.totalBudget), 0);
  const absorbed = lpjs.reduce((s, l) => s + toNumber(l.totalRealized), 0);
  const available = allocated - committed;
  const utilization = allocated === 0 ? 0 : (absorbed / allocated) * 100;

  return {
    allocationId,
    allocated,
    committed,
    absorbed,
    available,
    utilization: Math.round(utilization * 10) / 10,
  };
}

export async function getAvailableForAllocation(
  allocationId: number,
  excludeProposalId?: number,
): Promise<number> {
  const allocation = await prisma.budgetAllocation.findUniqueOrThrow({
    where: { id: allocationId },
  });
  const proposals = await prisma.proposal.findMany({
    where: {
      allocationId,
      status: 'final',
      ...(excludeProposalId ? { id: { not: excludeProposalId } } : {}),
    },
    select: { totalBudget: true },
  });
  const committed = proposals.reduce((s, p) => s + toNumber(p.totalBudget), 0);
  return toNumber(allocation.allocatedAmount) - committed;
}

export async function getPeriodSummary(periodId: number) {
  const allocations = await prisma.budgetAllocation.findMany({
    where: { periodId },
    include: { category: true },
  });

  const stats = await Promise.all(allocations.map((a) => getAllocationStats(a.id)));

  const totals = stats.reduce(
    (acc, s) => ({
      allocated: acc.allocated + s.allocated,
      committed: acc.committed + s.committed,
      absorbed: acc.absorbed + s.absorbed,
      available: acc.available + s.available,
    }),
    { allocated: 0, committed: 0, absorbed: 0, available: 0 },
  );

  return {
    allocations: allocations.map((a, i) => ({ ...a, stats: stats[i] })),
    totals,
  };
}

/**
 * Apply realisasi LPJ ke alokasi sumber. Dipanggil saat LPJ admin_approved.
 * Ditulis sebagai helper terpisah supaya bisa di-test & dipakai di approval flow.
 * Dijalankan dalam Prisma transaction.
 */
export async function postLpjRealization(
  tx: Prisma.TransactionClient,
  lpjId: number,
): Promise<void> {
  const lpj = await tx.lpj.findUniqueOrThrow({
    where: { id: lpjId },
    include: { proposal: true },
  });

  const items = await tx.lpjItem.findMany({ where: { lpjId } });
  const totalRealized = items.reduce((s, i) => s + toNumber(i.total), 0);
  const variance = toNumber(lpj.proposal.totalBudget) - totalRealized;

  await tx.lpj.update({
    where: { id: lpjId },
    data: { totalRealized, variance },
  });
}
