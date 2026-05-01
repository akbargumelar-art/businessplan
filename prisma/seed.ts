import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding…');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: {},
    create: {
      email: 'admin@local',
      name: 'Admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'admin',
      department: 'IT',
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@local' },
    update: {},
    create: {
      email: 'supervisor@local',
      name: 'Supervisor Sales',
      passwordHash: await bcrypt.hash('super123', 12),
      role: 'supervisor',
      department: 'Sales',
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@local' },
    update: {},
    create: {
      email: 'manager@local',
      name: 'Manager Promo',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'manager',
      department: 'Sales',
      supervisorId: supervisor.id,
    },
  });

  const categoryDefs = [
    { code: 'PROMO_TRADE', name: 'Promo Trade', description: 'Promo channel B2B / trade marketing', sortOrder: 1 },
    { code: 'PROMO_KONS', name: 'Promo Konsumen', description: 'Promo end-user / B2C', sortOrder: 2 },
    { code: 'PROG_EDU', name: 'Program Edukasi', description: 'Training, workshop, edukasi pasar', sortOrder: 3 },
    { code: 'PROG_CSR', name: 'Program CSR', description: 'CSR & community engagement', sortOrder: 4 },
    { code: 'CADANGAN', name: 'Cadangan', description: 'Pool top-up untuk reallocation', sortOrder: 99 },
  ];
  for (const c of categoryDefs) {
    await prisma.budgetCategory.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }

  await prisma.numberingConfig.upsert({
    where: { name: 'proposal' },
    update: {},
    create: {
      name: 'proposal',
      formatString: 'PRP/{TPL}/{NO:0000}/{MM}/{YYYY}',
      resetPeriod: 'year',
      currentSequence: 0,
    },
  });

  // Current month period
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let period = await prisma.budgetPeriod.findUnique({
    where: { year_month: { year, month } },
  });
  if (!period) {
    const monthNames = [
      'Januari','Februari','Maret','April','Mei','Juni',
      'Juli','Agustus','September','Oktober','November','Desember',
    ];
    period = await prisma.budgetPeriod.create({
      data: {
        name: `${monthNames[month - 1]} ${year}`,
        year,
        month,
        startDate: new Date(Date.UTC(year, month - 1, 1)),
        endDate: new Date(Date.UTC(year, month, 0)),
        status: 'active',
        createdById: admin.id,
      },
    });
  }

  const allocPlan: Record<string, number> = {
    PROMO_TRADE: 50_000_000,
    PROMO_KONS: 30_000_000,
    PROG_EDU: 15_000_000,
    PROG_CSR: 10_000_000,
    CADANGAN: 20_000_000,
  };

  for (const [code, amount] of Object.entries(allocPlan)) {
    const cat = await prisma.budgetCategory.findUniqueOrThrow({ where: { code } });
    const exists = await prisma.budgetAllocation.findFirst({
      where: { periodId: period.id, categoryId: cat.id, department: null },
    });
    if (!exists) {
      await prisma.budgetAllocation.create({
        data: {
          periodId: period.id,
          categoryId: cat.id,
          allocatedAmount: amount,
          notes: 'Alokasi default seed',
          status: 'active',
          createdById: admin.id,
        },
      });
    }
  }

  console.log('Seed selesai.');
  console.log('Login:');
  console.log('  admin@local      / admin123');
  console.log('  supervisor@local / super123');
  console.log('  manager@local    / manager123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
