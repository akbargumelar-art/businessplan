import { nextProposalNumber, previewNumber } from '../src/lib/numbering';
import { prisma } from '../src/lib/prisma';

async function main() {
const before = await prisma.numberingConfig.findUnique({ where: { name: 'proposal' } });
console.log(`Format: ${before?.formatString}`);
console.log(`Sequence before: ${before?.currentSequence}`);

const num1 = await nextProposalNumber({ tokens: { TPL: 'PROMOT' } });
console.log(`\nGenerated #1: ${num1}`);

const num2 = await nextProposalNumber({ tokens: { TPL: 'PROGED' } });
console.log(`Generated #2: ${num2}`);

const after = await prisma.numberingConfig.findUnique({ where: { name: 'proposal' } });
console.log(`\nSequence after: ${after?.currentSequence}`);

console.log(`\nPreview at sequence 100: ${previewNumber(after?.formatString ?? '', { sequence: 100, date: new Date() }, { TPL: 'PREVIEW' })}`);

// Rollback so we don't consume real sequences
if (before) {
  await prisma.numberingConfig.update({
    where: { id: before.id },
    data: { currentSequence: before.currentSequence },
  });
  console.log(`\n[rolled back to ${before.currentSequence}]`);
}

await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
