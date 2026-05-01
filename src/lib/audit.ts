import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type AuditEntity = 'proposal' | 'lpj' | 'allocation' | 'reallocation' | 'period' | 'category' | 'user' | 'template';

function serialize(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  try {
    return JSON.stringify(v, (_, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    );
  } catch {
    return null;
  }
}

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
    before: serialize(opts.before),
    after: serialize(opts.after),
    note: opts.note ?? null,
  };
  const client = opts.tx ?? prisma;
  await client.auditLog.create({ data });
}

export function parseAudit(s: string | null): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
