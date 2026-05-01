import { prisma } from './prisma';
import { getAvailableForAllocation } from './budget';
import type { Role } from '@prisma/client';

export async function listAvailableAllocations() {
  const now = new Date();
  const allocations = await prisma.budgetAllocation.findMany({
    where: {
      status: 'active',
      period: {
        status: { in: ['planning', 'active'] },
        endDate: { gte: now },
      },
    },
    include: { category: true, period: true },
    orderBy: [{ period: { startDate: 'desc' } }, { category: { sortOrder: 'asc' } }],
  });

  const withAvail = await Promise.all(
    allocations.map(async (a) => ({
      id: a.id,
      label: `${a.period.name} • ${a.category.name}${a.department ? ` • ${a.department}` : ''}`,
      available: await getAvailableForAllocation(a.id),
      category: a.category.name,
      period: a.period.name,
    })),
  );

  return withAvail;
}

export type ProposalScope = { userId: number; role: Role };

export function proposalVisibilityWhere(scope: ProposalScope) {
  if (scope.role === 'admin') return {};
  if (scope.role === 'supervisor') {
    return {
      OR: [
        { createdById: scope.userId },
        { createdBy: { supervisorId: scope.userId } },
      ],
    };
  }
  return { createdById: scope.userId };
}
