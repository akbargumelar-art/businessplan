import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

async function main() {
  console.log('Seeding…');

  // ─── USERS ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: {},
    create: {
      email: 'admin@local',
      name: 'Admin Sistem',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'admin',
      department: 'IT',
    },
  });

  const supSales = await prisma.user.upsert({
    where: { email: 'sup.sales@local' },
    update: {},
    create: {
      email: 'sup.sales@local',
      name: 'Bambang (Sup Sales)',
      passwordHash: await bcrypt.hash('super123', 12),
      role: 'supervisor',
      department: 'Sales',
    },
  });

  const supMkt = await prisma.user.upsert({
    where: { email: 'sup.mkt@local' },
    update: {},
    create: {
      email: 'sup.mkt@local',
      name: 'Diana (Sup Marketing)',
      passwordHash: await bcrypt.hash('super123', 12),
      role: 'supervisor',
      department: 'Marketing',
    },
  });

  const mgrAndi = await prisma.user.upsert({
    where: { email: 'andi@local' },
    update: {},
    create: {
      email: 'andi@local',
      name: 'Andi (Mgr Promo)',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'manager',
      department: 'Sales',
      supervisorId: supSales.id,
    },
  });

  const mgrBudi = await prisma.user.upsert({
    where: { email: 'budi@local' },
    update: {},
    create: {
      email: 'budi@local',
      name: 'Budi (Mgr Trade)',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'manager',
      department: 'Sales',
      supervisorId: supSales.id,
    },
  });

  const mgrCitra = await prisma.user.upsert({
    where: { email: 'citra@local' },
    update: {},
    create: {
      email: 'citra@local',
      name: 'Citra (Mgr CSR)',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'manager',
      department: 'Marketing',
      supervisorId: supMkt.id,
    },
  });

  // ─── CATEGORIES ────────────────────────────────────────────────
  const categoryDefs = [
    { code: 'PROMO_TRADE', name: 'Promo Trade', description: 'Promo channel B2B / trade marketing', sortOrder: 1 },
    { code: 'PROMO_KONS', name: 'Promo Konsumen', description: 'Promo end-user / B2C', sortOrder: 2 },
    { code: 'PROG_EDU', name: 'Program Edukasi', description: 'Training, workshop, edukasi pasar', sortOrder: 3 },
    { code: 'PROG_CSR', name: 'Program CSR', description: 'CSR & community engagement', sortOrder: 4 },
    { code: 'CADANGAN', name: 'Cadangan', description: 'Pool top-up untuk reallocation', sortOrder: 99 },
  ];
  const categories: Record<string, { id: number }> = {};
  for (const c of categoryDefs) {
    const cat = await prisma.budgetCategory.upsert({
      where: { code: c.code }, update: c, create: c,
    });
    categories[c.code] = { id: cat.id };
  }

  // ─── NUMBERING CONFIG ────────────────────────────────────────────────
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

  // ─── PERIODS — bulan lalu, bulan ini, bulan depan ────────────────────────────────────────────────
  const now = new Date();
  const periods: { id: number; name: string; year: number; month: number; status: string }[] = [];

  for (const offset of [-1, 0, 1]) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const status = offset < 0 ? 'closed' : offset === 0 ? 'active' : 'planning';

    let p = await prisma.budgetPeriod.findUnique({ where: { year_month: { year, month } } });
    if (!p) {
      p = await prisma.budgetPeriod.create({
        data: {
          name: `${monthNames[month - 1]} ${year}`,
          year, month,
          startDate: new Date(Date.UTC(year, month - 1, 1)),
          endDate: new Date(Date.UTC(year, month, 0)),
          status,
          createdById: admin.id,
        },
      });
    } else if (p.status !== status) {
      p = await prisma.budgetPeriod.update({ where: { id: p.id }, data: { status } });
    }
    periods.push(p);
  }

  const lastMonth = periods[0];
  const thisMonth = periods[1];
  const nextMonth = periods[2];

  // ─── ALLOCATIONS per periode ────────────────────────────────────────────────
  const allocPlan: Record<string, number> = {
    PROMO_TRADE: 50_000_000,
    PROMO_KONS: 30_000_000,
    PROG_EDU: 15_000_000,
    PROG_CSR: 10_000_000,
    CADANGAN: 20_000_000,
  };

  const allocByPeriodCat = new Map<string, { id: number }>();
  for (const period of periods) {
    for (const [code, amount] of Object.entries(allocPlan)) {
      const cat = categories[code];
      const exists = await prisma.budgetAllocation.findFirst({
        where: { periodId: period.id, categoryId: cat.id, department: null },
      });
      const a = exists ?? await prisma.budgetAllocation.create({
        data: {
          periodId: period.id,
          categoryId: cat.id,
          allocatedAmount: new Prisma.Decimal(amount),
          notes: `Alokasi default ${monthNames[period.month! - 1]}`,
          status: 'active',
          createdById: admin.id,
        },
      });
      allocByPeriodCat.set(`${period.id}:${code}`, { id: a.id });
    }
  }

  // ─── PROPOSALS — beberapa di tiap status ────────────────────────────────────────────────
  // helper untuk bikin proposal + items
  async function makeProposal(opts: {
    title: string;
    creatorId: number;
    periodId: number;
    categoryCode: string;
    items: { name: string; qty: number; unitPrice: number }[];
    eventStart: Date;
    eventEnd: Date;
    objective: string;
    goal: string;
    status?: 'draft' | 'final' | 'cancelled';
    number?: string | null;
    finalizedAt?: Date | null;
  }) {
    const allocId = allocByPeriodCat.get(`${opts.periodId}:${opts.categoryCode}`)!.id;
    const total = opts.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

    return prisma.proposal.create({
      data: {
        title: opts.title,
        objective: opts.objective,
        goal: opts.goal,
        allocationId: allocId,
        totalBudget: new Prisma.Decimal(total),
        eventStartDate: opts.eventStart,
        eventEndDate: opts.eventEnd,
        status: opts.status ?? 'draft',
        number: opts.number ?? null,
        createdById: opts.creatorId,
        finalizedAt: opts.finalizedAt ?? null,
        items: {
          create: opts.items.map((i, idx) => ({
            name: i.name, qty: i.qty,
            unitPrice: new Prisma.Decimal(i.unitPrice),
            total: new Prisma.Decimal(i.qty * i.unitPrice),
            sortOrder: idx,
          })),
        },
      },
      include: { items: true },
    });
  }

  // Skip if already seeded with proposals
  const existingProposals = await prisma.proposal.count();
  if (existingProposals === 0) {
    // BULAN LALU — proposals already final + LPJ approved
    const p1 = await makeProposal({
      title: 'Promo Trade Akhir Bulan — Diskon Distributor',
      creatorId: mgrBudi.id,
      periodId: lastMonth.id,
      categoryCode: 'PROMO_TRADE',
      eventStart: new Date(lastMonth.startDate),
      eventEnd: new Date(new Date(lastMonth.startDate).getTime() + 14 * 86_400_000),
      objective: 'Mendorong sell-in distributor menjelang akhir bulan.',
      goal: 'Tambah volume sell-in 15% vs bulan lalu.',
      items: [
        { name: 'Diskon kuantitas tier A (50 distributor)', qty: 50, unitPrice: 200_000 },
        { name: 'Hadiah merchandise (kaos, mug)', qty: 100, unitPrice: 50_000 },
        { name: 'Biaya promo digital (banner, ads)', qty: 1, unitPrice: 5_000_000 },
      ],
      status: 'final',
      number: 'PRP/PROMOT/0001/' + String(lastMonth.month).padStart(2, '0') + '/' + lastMonth.year,
      finalizedAt: new Date(lastMonth.startDate),
    });

    const p2 = await makeProposal({
      title: 'Workshop Produk Baru — Cabang Jakarta',
      creatorId: mgrAndi.id,
      periodId: lastMonth.id,
      categoryCode: 'PROG_EDU',
      eventStart: new Date(new Date(lastMonth.startDate).getTime() + 7 * 86_400_000),
      eventEnd: new Date(new Date(lastMonth.startDate).getTime() + 8 * 86_400_000),
      objective: 'Edukasi produk baru ke tim sales cabang Jakarta.',
      goal: '50 sales tahu fitur & USP produk baru.',
      items: [
        { name: 'Sewa ruangan (2 hari)', qty: 2, unitPrice: 1_500_000 },
        { name: 'Konsumsi peserta', qty: 50, unitPrice: 75_000 },
        { name: 'Trainer external', qty: 1, unitPrice: 5_000_000 },
        { name: 'Material training', qty: 50, unitPrice: 25_000 },
      ],
      status: 'final',
      number: 'PRP/PROGED/0002/' + String(lastMonth.month).padStart(2, '0') + '/' + lastMonth.year,
      finalizedAt: new Date(lastMonth.startDate),
    });

    // LPJ approved untuk p1 (under-absorbed) dan p2 (sesuai)
    const p1Items = p1.items;
    const p1Lpj = await prisma.lpj.create({
      data: {
        proposalId: p1.id,
        narrative: 'Promo berjalan lancar selama 14 hari. Distributor antusias terutama di tier A. Beberapa hadiah merchandise tidak terbagi habis karena perubahan plan distribusi.',
        evaluation: 'Plan distribusi merchandise perlu lebih awal di-coordinate dengan logistic. Untuk promo berikutnya, kuantitas merch dikurangi 20% atau dipakai juga untuk customer.',
        totalRealized: new Prisma.Decimal(18_500_000),
        variance: new Prisma.Decimal(p1.totalBudget).sub(18_500_000),
        status: 'admin_approved',
        createdById: mgrBudi.id,
        submittedAt: new Date(lastMonth.endDate),
        reviewedAt: new Date(lastMonth.endDate),
        approvedAt: new Date(lastMonth.endDate),
        items: {
          create: [
            { name: p1Items[0].name, qty: 48, unitPrice: new Prisma.Decimal(200_000), total: new Prisma.Decimal(9_600_000), proposalItemId: p1Items[0].id },
            { name: p1Items[1].name, qty: 80, unitPrice: new Prisma.Decimal(50_000), total: new Prisma.Decimal(4_000_000), proposalItemId: p1Items[1].id },
            { name: p1Items[2].name, qty: 1, unitPrice: new Prisma.Decimal(4_900_000), total: new Prisma.Decimal(4_900_000), proposalItemId: p1Items[2].id },
          ],
        },
      },
    });

    const p2Items = p2.items;
    await prisma.lpj.create({
      data: {
        proposalId: p2.id,
        narrative: 'Workshop berjalan 2 hari penuh. 50 peserta hadir, 48 menyelesaikan post-test dengan skor rata-rata 85.',
        evaluation: 'Peserta minta materi tambahan tentang competitor benchmarking. Untuk batch berikut, alokasikan 30 menit untuk sesi ini.',
        totalRealized: new Prisma.Decimal(12_500_000),
        variance: new Prisma.Decimal(p2.totalBudget).sub(12_500_000),
        status: 'admin_approved',
        createdById: mgrAndi.id,
        submittedAt: new Date(lastMonth.endDate),
        reviewedAt: new Date(lastMonth.endDate),
        approvedAt: new Date(lastMonth.endDate),
        items: {
          create: [
            { name: p2Items[0].name, qty: 2, unitPrice: new Prisma.Decimal(1_500_000), total: new Prisma.Decimal(3_000_000), proposalItemId: p2Items[0].id },
            { name: p2Items[1].name, qty: 48, unitPrice: new Prisma.Decimal(75_000), total: new Prisma.Decimal(3_600_000), proposalItemId: p2Items[1].id },
            { name: p2Items[2].name, qty: 1, unitPrice: new Prisma.Decimal(5_000_000), total: new Prisma.Decimal(5_000_000), proposalItemId: p2Items[2].id },
            { name: p2Items[3].name, qty: 50, unitPrice: new Prisma.Decimal(18_000), total: new Prisma.Decimal(900_000), proposalItemId: p2Items[3].id },
          ],
        },
      },
    });

    // BULAN INI — proposals di berbagai status
    await makeProposal({
      title: 'Promo Konsumen Lebaran',
      creatorId: mgrAndi.id,
      periodId: thisMonth.id,
      categoryCode: 'PROMO_KONS',
      eventStart: new Date(thisMonth.startDate),
      eventEnd: new Date(new Date(thisMonth.startDate).getTime() + 20 * 86_400_000),
      objective: 'Capture momentum belanja Lebaran di channel modern trade.',
      goal: 'Sell-out di MT naik 25% vs bulan biasa.',
      items: [
        { name: 'POSM in-store (poster, hanger)', qty: 200, unitPrice: 35_000 },
        { name: 'Diskon harga konsumen (1000 SKU)', qty: 1000, unitPrice: 5_000 },
        { name: 'SPG cabang utama', qty: 10, unitPrice: 1_500_000 },
      ],
      status: 'final',
      number: 'PRP/PROMOK/0003/' + String(thisMonth.month).padStart(2, '0') + '/' + thisMonth.year,
      finalizedAt: new Date(),
    });

    const p4 = await makeProposal({
      title: 'CSR Donasi Buku Sekolah Pelosok',
      creatorId: mgrCitra.id,
      periodId: thisMonth.id,
      categoryCode: 'PROG_CSR',
      eventStart: new Date(new Date(thisMonth.startDate).getTime() + 10 * 86_400_000),
      eventEnd: new Date(new Date(thisMonth.startDate).getTime() + 12 * 86_400_000),
      objective: 'Donasi 500 paket buku ke 5 SD di pelosok Jawa Barat.',
      goal: 'Brand awareness via PR + community engagement.',
      items: [
        { name: 'Paket buku per anak (100 paket x 5 SD)', qty: 500, unitPrice: 12_000 },
        { name: 'Transport tim & barang', qty: 1, unitPrice: 3_000_000 },
        { name: 'Biaya dokumentasi & PR', qty: 1, unitPrice: 1_500_000 },
      ],
      status: 'final',
      number: 'PRP/PROGCS/0004/' + String(thisMonth.month).padStart(2, '0') + '/' + thisMonth.year,
      finalizedAt: new Date(),
    });

    // LPJ submitted (menunggu review supervisor) untuk p4
    await prisma.lpj.create({
      data: {
        proposalId: p4.id,
        narrative: 'Donasi terlaksana di 5 SD sesuai rencana. Liputan dari media lokal mendapat 3 publikasi.',
        evaluation: 'Untuk batch berikut, koordinasi dengan dinas pendidikan kabupaten lebih dini agar timing pengiriman lebih tepat.',
        totalRealized: new Prisma.Decimal(9_500_000),
        variance: new Prisma.Decimal(p4.totalBudget).sub(9_500_000),
        status: 'submitted',
        createdById: mgrCitra.id,
        submittedAt: new Date(),
        items: {
          create: [
            { name: 'Paket buku per anak', qty: 500, unitPrice: new Prisma.Decimal(11_500), total: new Prisma.Decimal(5_750_000) },
            { name: 'Transport tim & barang', qty: 1, unitPrice: new Prisma.Decimal(2_750_000), total: new Prisma.Decimal(2_750_000) },
            { name: 'Biaya dokumentasi & PR', qty: 1, unitPrice: new Prisma.Decimal(1_000_000), total: new Prisma.Decimal(1_000_000) },
          ],
        },
      },
    });

    // Draft proposal (belum di-finalize)
    await makeProposal({
      title: 'Roadshow Edukasi 5 Kota — DRAFT',
      creatorId: mgrAndi.id,
      periodId: thisMonth.id,
      categoryCode: 'PROG_EDU',
      eventStart: new Date(new Date(thisMonth.startDate).getTime() + 18 * 86_400_000),
      eventEnd: new Date(new Date(thisMonth.startDate).getTime() + 22 * 86_400_000),
      objective: 'Roadshow edukasi produk ke 5 kota utama Jawa.',
      goal: 'Reach 1000+ retailer.',
      items: [
        { name: 'Sewa venue 5 kota', qty: 5, unitPrice: 2_000_000 },
        { name: 'Konsumsi & suvenir per peserta', qty: 1000, unitPrice: 25_000 },
        { name: 'Tim trainer & SPG', qty: 5, unitPrice: 3_000_000 },
      ],
      status: 'draft',
    });

    // BULAN DEPAN — semua draft (planning)
    await makeProposal({
      title: 'Persiapan Promo Tahun Baru',
      creatorId: mgrBudi.id,
      periodId: nextMonth.id,
      categoryCode: 'PROMO_TRADE',
      eventStart: new Date(nextMonth.startDate),
      eventEnd: new Date(nextMonth.endDate),
      objective: 'Promo end-of-year ke distributor.',
      goal: 'Sell-in stabil menjelang tutup buku.',
      items: [
        { name: 'Diskon kuantitas distributor', qty: 60, unitPrice: 250_000 },
        { name: 'Insentif sales internal', qty: 1, unitPrice: 8_000_000 },
      ],
      status: 'draft',
    });

    // ─── REALLOCATION dummy ────────────────────────────────────────────────
    // Dari CADANGAN → PROG_CSR bulan ini (top-up), sudah approved
    const sourceCadangan = allocByPeriodCat.get(`${thisMonth.id}:CADANGAN`)!;
    const targetCSR = allocByPeriodCat.get(`${thisMonth.id}:PROG_CSR`)!;

    await prisma.budgetReallocation.create({
      data: {
        type: 'topup',
        sourceAllocationId: sourceCadangan.id,
        targetAllocationId: targetCSR.id,
        amount: new Prisma.Decimal(5_000_000),
        reason: 'Permintaan tambahan dari tim CSR untuk sub-kegiatan donasi buku perpustakaan keliling. Dana cadangan masih tersedia.',
        effectiveDate: new Date(),
        requestedById: mgrCitra.id,
        status: 'admin_approved',
        reviewedAt: new Date(),
        approvedAt: new Date(),
        snapshotBefore: JSON.stringify({
          source: { allocated: 20_000_000 },
          target: { allocated: 10_000_000 },
        }),
        snapshotAfter: JSON.stringify({
          source: { allocated: 15_000_000 },
          target: { allocated: 15_000_000 },
        }),
      },
    });
    // Apply the top-up: update allocations to match snapshot
    await prisma.budgetAllocation.update({
      where: { id: sourceCadangan.id },
      data: { allocatedAmount: new Prisma.Decimal(15_000_000) },
    });
    await prisma.budgetAllocation.update({
      where: { id: targetCSR.id },
      data: { allocatedAmount: new Prisma.Decimal(15_000_000) },
    });

    // Reallocation pending approval (transfer)
    const sourceTrade = allocByPeriodCat.get(`${thisMonth.id}:PROMO_TRADE`)!;
    const targetKons = allocByPeriodCat.get(`${thisMonth.id}:PROMO_KONS`)!;
    await prisma.budgetReallocation.create({
      data: {
        type: 'transfer',
        sourceAllocationId: sourceTrade.id,
        targetAllocationId: targetKons.id,
        amount: new Prisma.Decimal(7_500_000),
        reason: 'Promo trade bulan ini under-utilized karena distributor lebih fokus stok lebaran. Alihkan ke promo konsumen yang demand-nya tinggi.',
        effectiveDate: new Date(),
        requestedById: mgrAndi.id,
        status: 'submitted',
      },
    });
  }

  console.log('\nSeed selesai.');
  console.log('─────────────────────────────────────────────');
  console.log('Login:');
  console.log('  admin@local        / admin123     (admin)');
  console.log('  sup.sales@local    / super123     (supervisor)');
  console.log('  sup.mkt@local      / super123     (supervisor)');
  console.log('  andi@local         / manager123   (manager)');
  console.log('  budi@local         / manager123   (manager)');
  console.log('  citra@local        / manager123   (manager)');
  console.log('─────────────────────────────────────────────');
  console.log('Data: 3 periode (lalu/ini/depan), 5 kategori,');
  console.log('15 alokasi, 6 proposal di berbagai status,');
  console.log('3 LPJ (2 approved + 1 submitted), 2 reallocation.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
