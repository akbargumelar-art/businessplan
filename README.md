# Business Plan Manager

Aplikasi internal untuk mengelola alokasi budget bulanan, proposal pengajuan dana, LPJ (laporan pertanggungjawaban), dan reallocation antar program.

Spesifikasi lengkap: lihat [`PRD.md`](./PRD.md).

---

## Stack

- **Next.js 15** App Router + React 19
- **Tailwind CSS v4** (CSS-first config)
- **Prisma** ORM + **MySQL 8**
- **NextAuth v5 (Auth.js)** — credentials provider
- **@react-pdf/renderer** untuk generate PDF proposal
- **Recharts** untuk dashboard charts

---

## Modul

| Modul | URL | Akses |
|---|---|---|
| Dashboard | `/dashboard` | Semua user (data scoped per role) |
| Periode Budget | `/budget/periods` | Lihat: semua. Manage: admin/supervisor |
| Kategori Budget | `/budget/categories` | Admin only |
| Proposal | `/proposals` | Manager: punya sendiri. Supervisor: tim. Admin: semua. |
| LPJ | `/lpj` | Workflow: draft → submitted → supervisor_reviewed → admin_approved |
| Reallocation | `/reallocations` | Workflow approval seperti LPJ |
| Reports | `/reports` | Tahunan, per kategori |
| Documentation | `/documentation` | Gallery foto/nota |
| Users | `/admin/users` | Admin only |
| Settings | `/admin/settings` | Admin only — config penomoran proposal |

---

## Setup Lokal (Windows) — Default SQLite, Tanpa Install

Setup default pakai **SQLite** (file `prisma/dev.db`, tidak perlu install MySQL/Docker). Saat deploy ke prod, switch ke MySQL.

```bash
npm install
cp .env.example .env       # default sudah pakai SQLite
npm run db:push            # bikin tabel di file dev.db
npm run db:seed            # isi 6 user + alokasi + 6 proposal + 3 LPJ + 2 reallocation dummy
npm run dev                # http://localhost:3000
```

**Akun seed:**
| Email | Password | Role | Catatan |
|---|---|---|---|
| admin@local | admin123 | admin | Bisa segala hal |
| sup.sales@local | super123 | supervisor | Review LPJ tim Sales (Andi & Budi) |
| sup.mkt@local | super123 | supervisor | Review LPJ tim Marketing (Citra) |
| andi@local | manager123 | manager | Punya 2 proposal, 1 LPJ approved |
| budi@local | manager123 | manager | Punya 1 proposal final + LPJ approved |
| citra@local | manager123 | manager | Punya CSR proposal + LPJ submitted |

Login → akan redirect ke `/dashboard`.

### Switch ke MySQL (untuk production)

1. Replace schema:
   ```bash
   cp prisma/schema.mysql.prisma prisma/schema.prisma
   ```
2. Edit `.env`: ganti `DATABASE_URL` ke `mysql://user:password@host:3306/dbname`.
3. Pastikan database & user MySQL sudah dibuat di server.
4. `npm run db:push` (atau `db:migrate:deploy` kalau pakai migrations).
5. `npm run db:seed` (opsional — bisa skip kalau mau bikin user manual).

---

## Alur Penggunaan

### 1. Setup Awal (Admin)
1. Login sebagai admin → `/budget/categories` — cek/tambah kategori (Promo Trade, Promo Konsumen, dll).
2. `/admin/settings` — set format nomor proposal jika perlu.
3. `/admin/users` — buat akun supervisor & manager.

### 2. Awal Bulan — Meeting Alokasi
1. Login admin/supervisor → `/budget/periods` — buat periode bulan ini (status `planning`).
2. Klik detail periode → tambah `Alokasi` per kategori (input nilai + dept opsional).
3. Saat siap, klik "Aktifkan" — status periode jadi `active`, manager bisa mulai bikin proposal.

### 3. Manager Buat Proposal
1. Login manager → `/proposals/new`.
2. Pilih alokasi (sistem tampilkan sisa alokasi real-time).
3. Isi item rincian. Total tidak boleh > sisa alokasi (dicek saat finalize).
4. **Save Draft** → review → **Finalize**. Status jadi `final`, dapat nomor otomatis.
5. Download PDF dari tombol "Lihat PDF".

### 4. Eksekusi Selesai → Buat LPJ
1. Buka proposal `final` → klik "Buat LPJ".
2. Sistem pre-fill item dari proposal — manager update `qty` dan `unitPrice` sesuai realisasi.
3. Tambah narasi & evaluasi → **Submit**.
4. Supervisor review → mark reviewed. Admin approve.
5. Saat `admin_approved`, total realisasi otomatis tercatat di alokasi sumber, jadi muncul di dashboard sebagai `Absorbed`.

### 5. Pengalihan Dana (Reallocation)
- Jika program A under-absorbed dan program B perlu top-up:
  1. Manager → `/reallocations/new`
  2. Tipe: `Transfer`. Pilih sumber (A) & target (B). Isi alasan.
  3. Submit → Supervisor review → Admin approve.
  4. Saat approved: `allocated_amount` di A dikurangi, di B ditambah, dalam satu transaksi DB.

---

## Deploy ke VPS

### Build & push ke GitHub
```bash
git init
git add .
git commit -m "init business plan manager"
git remote add origin git@github.com:USERNAME/businessplan.git
git push -u origin main
```

### Di VPS Ubuntu (sesuai PRD §4)

**Prereq di VPS:**
- Node.js 20+ (via `nvm` atau `nodesource`)
- MySQL 8.x
- Nginx + Certbot
- PM2 (`npm i -g pm2`)

**Steps:**
```bash
git clone git@github.com:USERNAME/businessplan.git
cd businessplan
cp .env.example .env
# edit .env: DATABASE_URL pakai user/password MySQL prod, AUTH_SECRET random kuat
npm ci
npx prisma migrate deploy   # (jika sudah pakai migrations) atau npm run db:push
npm run db:seed             # opsional, buat akun admin pertama
npm run build
pm2 start npm --name businessplan -- start
pm2 save
pm2 startup
```

**Nginx reverse proxy** (`/etc/nginx/sites-available/businessplan`):
```nginx
server {
    server_name budget.example.com;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/businessplan /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d budget.example.com
```

### Update di VPS
```bash
cd businessplan
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart businessplan
```

---

## Scripts

| Command | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (otomatis `prisma generate`) |
| `npm start` | Run production |
| `npm run db:push` | Sinkronkan schema ke DB tanpa migration files |
| `npm run db:migrate` | Buat migration file (dev) |
| `npm run db:migrate:deploy` | Apply migrations (prod) |
| `npm run db:seed` | Run seed |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run lint` | ESLint |

---

## Struktur Folder

```
src/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── login/page.tsx
│   ├── (app)/                # route group dengan sidebar
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── budget/
│   │   ├── proposals/
│   │   ├── lpj/
│   │   ├── reallocations/
│   │   ├── reports/
│   │   ├── documentation/
│   │   └── admin/
│   └── api/auth/[...nextauth]/route.ts
├── components/
│   ├── ui/            # button, input, card, table, badge, progress
│   ├── pdf/           # @react-pdf/renderer components
│   ├── sidebar.tsx, mobile-nav.tsx
│   ├── proposal-form.tsx, lpj-form.tsx
│   └── dashboard-charts.tsx
├── lib/
│   ├── prisma.ts, auth.ts, permissions.ts
│   ├── numbering.ts, budget.ts, audit.ts
│   ├── format.ts, queries.ts, upload.ts, cn.ts
├── server/actions/    # all server actions (Next.js Server Actions)
└── middleware.ts      # auth gate
prisma/
├── schema.prisma
└── seed.ts
```

---

## Belum termasuk MVP (lihat PRD §5 v1.1+)

- Drag-and-drop template builder (saat ini pakai 1 template default hard-coded)
- Email notifikasi (workflow transitions)
- File upload untuk attachment (UI ada, server action saving belum)
- Object storage (S3) — saat ini lokal di `public/uploads`
- Bulk export PDF
- Audit log viewer UI

---

## License

Internal use only.
