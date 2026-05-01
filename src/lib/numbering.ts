import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const TOKEN_RE = /\{(NO|YYYY|YY|MM|DD|DEPT|TPL)(?::(\d+))?\}/g;

export type NumberingTokens = {
  DEPT?: string;
  TPL?: string;
};

function fillTokens(format: string, sequence: number, date: Date, extra: NumberingTokens) {
  const yyyy = date.getFullYear().toString();
  const yy = yyyy.slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return format.replace(TOKEN_RE, (_, key, padStr) => {
    const pad = padStr ? Number(padStr) : 0;
    switch (key) {
      case 'NO':
        return pad ? String(sequence).padStart(pad, '0') : String(sequence);
      case 'YYYY':
        return yyyy;
      case 'YY':
        return yy;
      case 'MM':
        return mm;
      case 'DD':
        return dd;
      case 'DEPT':
        return extra.DEPT ?? 'GEN';
      case 'TPL':
        return extra.TPL ?? 'GEN';
      default:
        return '';
    }
  });
}

function shouldReset(period: 'never' | 'year' | 'month', last: Date | null, now: Date) {
  if (period === 'never' || !last) return false;
  if (period === 'year') return last.getFullYear() !== now.getFullYear();
  if (period === 'month') {
    return (
      last.getFullYear() !== now.getFullYear() || last.getMonth() !== now.getMonth()
    );
  }
  return false;
}

export async function nextProposalNumber(opts: {
  configName?: string;
  tokens?: NumberingTokens;
  now?: Date;
  tx?: Prisma.TransactionClient;
} = {}): Promise<string> {
  const configName = opts.configName ?? 'proposal';
  const now = opts.now ?? new Date();
  const tokens = opts.tokens ?? {};

  const exec = async (tx: Prisma.TransactionClient) => {
    let cfg = await tx.numberingConfig.findUnique({ where: { name: configName } });
    if (!cfg) {
      cfg = await tx.numberingConfig.create({
        data: {
          name: configName,
          formatString: 'PRP/{TPL}/{NO:0000}/{MM}/{YYYY}',
          resetPeriod: 'year',
          currentSequence: 0,
        },
      });
    }

    let seq = cfg.currentSequence;
    let lastReset = cfg.lastResetAt;

    if (shouldReset(cfg.resetPeriod, lastReset, now)) {
      seq = 0;
      lastReset = now;
    }
    seq += 1;

    await tx.numberingConfig.update({
      where: { id: cfg.id },
      data: {
        currentSequence: seq,
        lastResetAt: lastReset,
      },
    });

    return fillTokens(cfg.formatString, seq, now, tokens);
  };

  if (opts.tx) return exec(opts.tx);
  return prisma.$transaction(exec, { isolationLevel: 'Serializable' });
}

export function previewNumber(format: string, sample = { sequence: 42, date: new Date() }, tokens: NumberingTokens = {}) {
  return fillTokens(format, sample.sequence, sample.date, tokens);
}
