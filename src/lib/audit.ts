import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type AuditEntity = 'proposal' | 'lpj' | 'allocation' | 'reallocation' | 'period' | 'category' | 'user' | 'template';

export async function logAudit(opts: {
  entity: AuditEntity;
  entityId: number;
  action: string;
  actorId?: number | null;
  before?: unknown;
  after?: unknown;
  note?: string;
  tx?: Prisma.TransactionClient;
}) {
  const data = {
    entityType: opts.entity,
    entityId: opts.entityId,
    action: opts.action,
    actorId: opts.actorId ?? null,
    before: opts.before === undefined ? Prisma.JsonNull : (opts.before as Prisma.InputJsonValue),
    after: opts.after === undefined ? Prisma.JsonNull : (opts.after as Prisma.InputJsonValue),
    note: opts.note ?? null,
  };
  const client = opts.tx ?? prisma;
  await client.auditLog.create({ data });
}
