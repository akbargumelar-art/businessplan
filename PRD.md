# Product Requirements Document
## Website Manajemen Business Plan & Budget

**Versi:** 0.2 (Draft)
**Tanggal:** 1 Mei 2026
**Author:** Akbar Gumelar
**Status:** Draft for Review

**Changelog v0.2:**
- Menambahkan modul **Budget Allocation** (alokasi budget bulanan per kategori promo/program).
- Menambahkan modul **Budget Reallocation** (pengalihan dana antar program saat under/over absorption).
- Menambahkan halaman **Dashboard** ke dalam scope MVP (sebelumnya v1.1).
- Menambahkan halaman **Documentation** untuk arsip foto & nota kegiatan.
- Memperluas Story 5 & 6 dengan integrasi ke alokasi budget.
- Menambahkan tabel DB: `budget_periods`, `budget_categories`, `budget_allocations`, `budget_reallocations`.

---

## 1. Executive Summary

### Problem Statement
Tim internal saat ini mengelola alokasi budget bulanan untuk promo & program secara manual (Excel terpisah-pisah), menyusun proposal pengajuan budget di Word/Google Docs dengan template inkonsisten, penomoran proposal manual yang rentan duplikat, dan tidak ada arsip terpusat. Akibatnya:

- Sulit memantau berapa dari alokasi bulanan yang sudah terpakai vs sisa.
- Pengalihan dana antar program (saat ada program under-absorbed atau over-budget) tidak terdokumentasi formal — sulit diaudit.
- Pencarian arsip lambat, format proposal tidak seragam antar tim.
- Laporan pertanggungjawaban (LPJ) sulit dilacak ke proposal asli & ke alokasi budget sumbernya.

### Proposed Solution
Aplikasi web internal berbasis Next.js 14 + Tailwind CSS + MySQL yang menyediakan:

1. **Budget Allocation** — admin/supervisor input alokasi budget bulanan per kategori (promo, program, dll), real-time dashboard penyerapan.
2. **Proposal Builder** — manager pilih template, isi form terstruktur, sistem generate PDF + nomor proposal otomatis. Setiap proposal **wajib link** ke alokasi budget sumber.
3. **LPJ Workflow** — manager submit LPJ realisasi, supervisor & admin approve. Selisih realisasi vs alokasi otomatis terhitung.
4. **Reallocation** — formal workflow pengalihan dana dari program under-absorbed ke program lain (atau penambahan dana untuk program over-budget) dengan audit trail.
5. **Dashboard & Reports** — visibilitas real-time per periode, kategori, departemen.
6. **Documentation** — arsip terpusat foto kegiatan & nota kuitansi.

### Success Criteria
- Waktu pembuatan satu proposal turun dari ≥ 60 menit (manual) menjadi ≤ 10 menit di sistem.
- 100% proposal yang dibuat sistem memiliki nomor unik tanpa duplikasi (divalidasi DB constraint + audit log).
- 100% proposal final ter-link ke alokasi budget sumber (tidak boleh ada "proposal gentayangan" tanpa sumber dana).
- ≥ 90% LPJ yang masuk dalam 30 hari pertama setelah go-live ter-link valid ke proposal sumber.
- 100% reallocation tercatat formal dengan approval supervisor/admin (tidak ada pengalihan dana siluman).
- Dashboard penyerapan budget bulanan available real-time, akurasi 100% terhadap data transaksi.
- PDF render time ≤ 3 detik untuk proposal dengan ≤ 10 halaman dan ≤ 20 dokumentasi gambar.
- Page load LCP ≤ 2.5 detik di koneksi 4G simulasi (Lighthouse).
- Adopsi internal: ≥ 80% manager aktif menggunakan sistem dalam 60 hari setelah go-live.

---

## 2. User Experience & Functionality

### User Personas

**Manager**
- Goal utama: menyusun proposal kegiatan & submit LPJ.
- Aktivitas: pilih template published, isi form, generate PDF, upload foto dokumentasi, isi LPJ.
- Frekuensi: 5–15 proposal per bulan.

**Supervisor**
- Goal utama: review & approve LPJ dari manager di bawahnya, monitor history proposal tim.
- Aktivitas: review LPJ (approve/reject dengan catatan), lihat dashboard history per manager, ekspor laporan.
- Frekuensi: review harian / mingguan.

**Admin**
- Goal utama: kelola template, user management, master data, dan final-approve LPJ.
- Aktivitas: design & publish template via drag-and-drop builder, manage akun, set format penomoran, audit history & ekspor laporan.
- Frekuensi: setup awal intensif, kemudian maintenance mingguan.

### User Stories

**Story 1 — Custom Template Builder (Admin)**
*As an admin, I want to design proposal templates via drag-and-drop builder so that all proposals follow a consistent corporate format.*

Acceptance Criteria:
- Admin dapat menambah, hapus, dan mengatur urutan section (heading, paragraph, form-field, image-placeholder, table, signature-block).
- Admin dapat mengatur logo, warna primer, font family, header & footer per template.
- Field type yang didukung minimal: text, longtext, number, currency (IDR), date, daterange, dropdown, multi-row table, image upload, signature.
- Setiap template tersimpan dengan version number; perubahan tidak mempengaruhi proposal yang sudah dibuat dengan versi lama.
- Preview real-time menampilkan layout yang akan jadi PDF.
- Template dapat di-set "draft" atau "published"; hanya yang published yang bisa dipakai bikin proposal.
- Admin bisa duplicate template untuk dijadikan baseline template baru.

**Story 2 — Membuat Proposal (Manager / Supervisor)**
*As a manager, I want to fill a structured form based on the chosen template so that I can produce a formal proposal PDF in minutes — and the proposal must be linked to a budget allocation so spending is always traceable.*

Acceptance Criteria:
- User memilih template published, sistem menampilkan form sesuai field di template.
- Field wajib (required) divalidasi sebelum finalize.
- Field standar yang harus tersedia di setiap proposal: judul, objective, goal, **kategori budget (FK ke `budget_categories`)**, **periode budget (FK ke `budget_periods`)**, **sumber alokasi (FK ke `budget_allocations`)**, total budget (auto-sum dari item), tanggal pelaksanaan (start–end), penyerapan budget (tabel item: nama, qty, harga satuan, total), dokumentasi rencana (image upload, max 10 file), tanda tangan.
- Saat user memilih kategori + periode, sistem menampilkan **sisa alokasi** (allocated – sum(committed proposals)) sebagai info real-time.
- **Hard rule:** total budget proposal **tidak boleh melebihi sisa alokasi** pada saat finalize. Jika melebihi, user harus reallocation dulu (Story 8) atau revisi total.
- Sistem auto-generate nomor proposal saat status berubah dari "draft" → "final" sesuai format yang di-set admin (lihat Story 4).
- User dapat simpan sebagai draft dan lanjutkan editing kapan saja.
- Tombol "Generate PDF" menghasilkan PDF dengan layout sesuai template + nomor proposal yang sudah ter-issue.
- Preview PDF tersedia sebelum finalize (preview pakai nomor "DRAFT-xxxx", bukan nomor final).

**Story 3 — Tanda Tangan Digital (Manager / Supervisor)**
*As a user, I want to sign the proposal either by drawing or uploading my signature so that the PDF is ready to print/share.*

Acceptance Criteria:
- User dapat memilih: gambar tanda tangan langsung di canvas (touch & mouse) atau upload PNG/JPG (max 2 MB).
- Tanda tangan tersimpan terenkripsi (file path AES-256) di server, terikat ke user, dan dapat dipakai ulang.
- User dapat hapus / ganti tanda tangan tersimpan.
- Tanda tangan di-render di posisi signature-block sesuai template, dengan transparent background.
- Tanda tangan satu user hanya bisa dipakai oleh user itu sendiri (validasi server-side).

**Story 4 — Auto Penomoran Proposal (Admin config + System)**
*As an admin, I want to configure the proposal numbering format so that numbers are unique, sequential, and follow company convention.*

Acceptance Criteria:
- Admin set format menggunakan token: `{NO}` (sequence), `{YYYY}`, `{MM}`, `{DD}`, `{DEPT}`, `{TPL}` (template code).
- Contoh format: `PRP/{TPL}/{NO:0000}/{MM}/{YYYY}` → menghasilkan `PRP/EVT/0042/04/2026`.
- Sequence reset per: tahun / bulan / never (configurable).
- Database constraint UNIQUE pada kolom number; race condition dihandle dengan transactional `SELECT … FOR UPDATE` + retry on conflict.
- Nomor di-issue saat finalisasi proposal, bukan saat draft.
- Admin dapat melihat preview format dengan sample data sebelum save config.

**Story 5 — Laporan Data History Proposal**
*As any user, I want a searchable history of proposals so that I can audit and reuse past data.*

Acceptance Criteria:
- Halaman history dengan filter: tanggal, pembuat, template, status (draft / final / with-LPJ / closed), keyword di judul.
- Tabel menampilkan: nomor, judul, pembuat, tanggal pelaksanaan, total budget, status LPJ.
- Visibility: manager hanya melihat proposal yang ia buat; supervisor melihat tim-nya (manager dengan supervisor_id = supervisor.id); admin melihat semua.
- Setiap baris bisa di-klik → detail page (preview PDF, riwayat aksi, link ke LPJ jika ada).
- Ekspor: CSV & XLSX, hormati filter aktif.
- Pagination server-side, default 25 per halaman.

**Story 6 — Laporan Pertanggungjawaban (LPJ) — Full Workflow**
*As a manager, I want to submit a comprehensive LPJ linked to a proposal, and have it reviewed and approved.*

Acceptance Criteria:
- Halaman LPJ dapat diakses dari proposal yang sudah final.
- Form LPJ berisi:
  - Realisasi budget per item (qty aktual, harga aktual, total) dengan kolom selisih dari proposal (auto-hitung).
  - Upload nota / kuitansi per item (PDF/JPG, max 5 MB per file).
  - Dokumentasi foto pelaksanaan kegiatan (max 30 file, max 5 MB per file).
  - Narasi pelaksanaan (rich-text, max 5000 karakter).
  - Kendala & evaluasi (rich-text, max 3000 karakter).
  - Tanda tangan pelapor.
- Approval flow LPJ: Manager submit → Supervisor review → Admin approve / reject.
- Status LPJ: `draft` → `submitted` → `supervisor_reviewed` → `admin_approved` | `rejected` (with note).
- Notifikasi email otomatis ke approver berikutnya saat status berubah.
- LPJ yang ditolak (`rejected`) bisa di-edit dan re-submit oleh creator.
- Generate PDF LPJ final yang menggabungkan: proposal asli (compact) + form LPJ + tabel realisasi + nota terlampir + dokumentasi foto.
- Audit log tiap transisi state (siapa, kapan, catatan).
- Saat LPJ `admin_approved`, **realisasi otomatis di-post** ke `budget_allocations.absorbed_amount` (sumber alokasi proposal). Selisih (under/over) memunculkan badge di dashboard dan jadi trigger untuk Story 8 (Reallocation).

**Story 7 — Alokasi Budget Bulanan (Admin / Supervisor)**
*As an admin / supervisor, I want to set monthly budget allocations per category so that all proposals draw from a controlled, visible pool.*

Acceptance Criteria:
- Setiap awal bulan (atau di awal periode kustom), admin/supervisor membuat record `budget_period` (mis. "Mei 2026") dengan tanggal mulai & berakhir.
- Untuk setiap periode, user dapat menambah satu atau lebih `budget_allocations`, masing-masing dengan: kategori (FK), departemen (opsional), nilai alokasi (IDR), catatan / tujuan.
- Master `budget_categories` dikelola admin (mis. "Promo Trade", "Promo Konsumen", "Program Edukasi", "Program CSR") — setiap kategori bisa di-set aktif/non-aktif.
- Setelah periode berjalan, allocation **dapat di-revisi** hanya oleh admin (audit log mencatat perubahan: nilai lama → nilai baru, alasan, oleh siapa).
- Sistem otomatis hitung 4 angka per allocation: `allocated`, `committed` (sum proposals final yang link ke alokasi ini), `absorbed` (sum LPJ approved), `available` (allocated – committed).
- Allocation dapat di-`lock` (tidak bisa lagi dipakai bikin proposal baru) atau `closed` (periode selesai, sisa otomatis ditandai surplus).
- Bulk-import allocation via CSV (template di-download dari sistem) untuk migrasi dari Excel lama.

**Story 8 — Reallocation / Pengalihan Dana (Manager request, Supervisor/Admin approve)**
*As a manager, when my program is under-absorbed or another program over-budgets, I want to formally request a reallocation of funds so that the budget book stays balanced and auditable.*

Acceptance Criteria:
- Reallocation memiliki dua tipe:
  1. **Transfer** — pindahkan sejumlah dana dari `allocation_source` ke `allocation_target`. Keduanya harus berada di periode yang sama (default), kecuali admin override antar-periode.
  2. **Top-up** — admin tambahkan dana baru ke `allocation_target` dari "pool cadangan" (kategori cadangan, jika tersedia).
- Form reallocation berisi: alokasi sumber, alokasi target, jumlah, alasan (rich-text), referensi proposal/LPJ pencetus (opsional), tanggal efektif.
- Validasi: jumlah transfer tidak boleh melebihi `available` di alokasi sumber.
- Approval flow: Manager request → Supervisor review → Admin approve / reject (note).
- Saat `admin_approved`: sistem otomatis update `allocated_amount` di kedua sisi (kurangi sumber, tambah target) dalam satu transaksi DB. Snapshot nilai sebelum & sesudah disimpan di `budget_reallocations.snapshot_before` dan `snapshot_after` (JSON).
- Reallocation yang sudah approved **tidak bisa dihapus**, hanya bisa direversal dengan reallocation baru bertipe `reversal` (link ke reallocation original).
- Notifikasi email otomatis ke approver berikutnya.
- Audit log lengkap.

**Story 9 — Dashboard (Semua user, scoped per role)**
*As any user, I want a dashboard that shows the current month budget health at a glance so that I can plan and act early.*

Acceptance Criteria:
- Header card: total `allocated`, `committed`, `absorbed`, `available` periode aktif.
- Chart: bar chart per kategori (allocated vs committed vs absorbed), donut chart komposisi alokasi.
- Tabel "Alokasi & Penyerapan" per kategori dengan progress bar penyerapan (warna: hijau ≤ 80%, kuning 80–100%, merah > 100%).
- Quick list: 5 proposal terbaru (dengan status), 5 LPJ pending review (untuk supervisor/admin), 5 reallocation pending.
- Filter periode (default: bulan berjalan) & kategori.
- Visibility scope:
  - Manager — lihat alokasi yang dipakai proposal dia + total pool kategori-nya.
  - Supervisor — lihat semua alokasi tim-nya.
  - Admin — lihat semua.
- Tombol "Export PDF dashboard" untuk meeting bulanan.

**Story 10 — Documentation Archive (Semua user)**
*As any user, I want a centralized media gallery of program documentation so that I can find photos and receipts quickly.*

Acceptance Criteria:
- Halaman gallery menampilkan grid thumbnail dari semua attachment yang masuk via proposal & LPJ.
- Filter: tipe (foto kegiatan / nota / dokumentasi rencana), proposal/LPJ asal, kategori budget, periode, pembuat.
- Klik thumbnail → preview full-size + metadata (nama file, ukuran, upload at, oleh siapa, link ke proposal/LPJ).
- Bulk download (zip) untuk filter aktif (max 500 file per zip).
- Visibility scope sama dengan Story 5.

### Non-Goals (v1.0)
- **Bukan** sistem approval untuk proposal — proposal langsung final tanpa approval flow (per requirement user; approval hanya berlaku di LPJ).
- **Bukan** sistem akuntansi / GL — tidak posting jurnal, tidak hitung pajak, tidak integrasi bank.
- **Bukan** ROI / outcome analytics di luar narasi LPJ.
- **Bukan** mobile native app — responsive web only di v1.0.
- **Bukan** multi-tenant SaaS — single-organization deployment.
- **Bukan** e-signature bersertifikat hukum (PrivyID / Mekari) — drawn / upload signature saja.
- **Bukan** integrasi ERP (SAP, Oracle) — pertimbangkan v2.0+.
- **Bukan** versi mobile offline / PWA installable di v1.0.

---

## 3. AI System Requirements

Tidak applicable di v1.0. Sistem ini tidak menggunakan komponen AI / LLM.

*Catatan untuk roadmap v2.0:* Potensi penambahan AI — auto-summary LPJ untuk supervisor, OCR nota untuk auto-fill rincian transaksi LPJ, dan deteksi anomali penyerapan budget (selisih aktual vs proposal yang outlier).

---

## 4. Technical Specifications

### Architecture Overview

**Stack:**
- Frontend: Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui (recommended).
- Backend: Next.js API routes / Server Actions, Node 20 LTS.
- Database: MySQL 8.x.
- File storage: Local filesystem di VPS (di-serve via Nginx) untuk dokumentasi & nota di MVP; upgrade path ke S3-compatible object storage di v1.1.
- PDF generation: server-side dengan **Puppeteer** (recommended untuk fidelity drag-and-drop layout) atau react-pdf (alternatif lebih ringan tapi layout terbatas).
- Drag-and-drop builder: dnd-kit atau react-grid-layout.
- Auth: NextAuth.js dengan credentials provider.
- Hosting: VPS Ubuntu 22.04 LTS, dengan Nginx reverse proxy → Node.js (PM2), MySQL service di host yang sama untuk MVP.

**Komponen Utama:**
1. **Auth Service** — NextAuth.js, password hashing bcrypt cost ≥ 12, session via JWT + DB session store.
2. **Template Engine** — JSON schema yang menyimpan struktur drag-and-drop, dipakai untuk render form dan render PDF (single source of truth).
3. **Form Renderer** — generate form dari template JSON dengan validasi (zod).
4. **PDF Renderer** — Puppeteer headless render dari halaman Next.js khusus print-view → output PDF stream → simpan ke filesystem.
5. **Numbering Service** — transactional sequence generator dengan locking + retry on conflict.
6. **LPJ Workflow Engine** — state machine dengan transition rules per role.
7. **File Service** — upload, MIME whitelist validation, virus scan opsional (ClamAV) di v1.1, quota per user.
8. **Notification Service** — email via SMTP transaction provider (Resend / SendGrid / Postmark).

**Data Flow Inti — Bikin Proposal:**

1. User pilih template (status: published).
2. Sistem fetch template JSON dari DB.
3. Form Renderer render form di client.
4. User isi & simpan draft → server validasi → simpan record `proposals` (status `draft`).
5. User klik "Finalize" → server generate nomor (transactional) → render PDF via Puppeteer → simpan PDF di filesystem → status `final`.
6. Return URL preview / download PDF.

### Integration Points

- **Email service** — SMTP (mis. Resend / SendGrid / Postmark) untuk notifikasi LPJ workflow.
- **Object storage (v1.1)** — S3-compatible (mis. MinIO self-hosted, AWS S3, Cloudflare R2) untuk file uploads.
- **Optional v2.0** — SSO via Google Workspace / Microsoft 365.

### Database Schema (Core Tables)

- `users` (id, email UNIQUE, password_hash, name, role ENUM[manager, supervisor, admin], supervisor_id FK NULLABLE, department, signature_image_path NULLABLE, active, created_at, updated_at)
- `templates` (id, name, code, version, json_schema LONGTEXT, brand_config JSON, status ENUM[draft, published], created_by FK, created_at, updated_at)
- `budget_categories` (id, code UNIQUE, name, description, active, sort_order, created_at, updated_at)
- `budget_periods` (id, name, year, month NULLABLE, start_date, end_date, status ENUM[planning, active, closed], created_by FK, created_at, updated_at) — `month` boleh null untuk periode kuartalan/tahunan, tapi standar MVP: monthly.
- `budget_allocations` (id, period_id FK, category_id FK, department NULLABLE, allocated_amount DECIMAL(15,2), notes TEXT, status ENUM[active, locked, closed], created_by FK, created_at, updated_at) — UNIQUE(period_id, category_id, department).
- `budget_reallocations` (id, source_allocation_id FK, target_allocation_id FK NULLABLE, type ENUM[transfer, topup, reversal], amount DECIMAL(15,2), reason TEXT, related_proposal_id FK NULLABLE, related_lpj_id FK NULLABLE, status ENUM[draft, submitted, supervisor_reviewed, admin_approved, rejected], snapshot_before JSON, snapshot_after JSON, effective_date, requested_by FK, reviewed_at NULLABLE, approved_at NULLABLE, created_at, updated_at)
- `proposals` (id, template_id FK NULLABLE, template_version NULLABLE, number UNIQUE NULLABLE, title, form_data JSON, status ENUM[draft, final, cancelled], created_by FK, allocation_id FK, total_budget DECIMAL(15,2), event_start_date, event_end_date, pdf_path, finalized_at NULLABLE, cancelled_at NULLABLE, cancel_reason TEXT NULLABLE, created_at, updated_at) — `allocation_id` WAJIB (NOT NULL) untuk proposal final.
- `proposal_items` (id, proposal_id FK, name, qty INT, unit_price DECIMAL(15,2), total DECIMAL(15,2), sort_order)
- `proposal_attachments` (id, proposal_id FK, file_path, file_type, label, sort_order, uploaded_by FK, created_at)
- `numbering_configs` (id, template_id FK NULLABLE, format_string, reset_period ENUM[never, year, month], current_sequence, last_reset_at)
- `lpjs` (id, proposal_id FK UNIQUE, form_data JSON, narrative TEXT, evaluation TEXT, total_realized DECIMAL(15,2), variance DECIMAL(15,2), status ENUM[draft, submitted, supervisor_reviewed, admin_approved, rejected], submitted_at NULLABLE, reviewed_at NULLABLE, approved_at NULLABLE, rejection_note TEXT NULLABLE, created_by FK, created_at, updated_at)
- `lpj_items` (id, lpj_id FK, proposal_item_id FK NULLABLE, name, qty INT, unit_price DECIMAL(15,2), total DECIMAL(15,2), variance DECIMAL(15,2), receipt_attachment_id FK NULLABLE)
- `lpj_attachments` (id, lpj_id FK, type ENUM[receipt, documentation], file_path, file_type, item_ref NULLABLE, label, uploaded_by FK, created_at)
- `audit_logs` (id, entity_type ENUM[proposal, lpj, allocation, reallocation, template, user], entity_id, action, actor_id FK, before JSON NULLABLE, after JSON NULLABLE, note TEXT, at_timestamp)
- `auth_sessions` (id, user_id FK, token, expires_at, created_at)
- `notifications` (id, user_id FK, type, title, body, link, read_at NULLABLE, created_at)

**Index penting:**
- `budget_allocations(period_id, category_id)`, `budget_allocations(status)`.
- `proposals(allocation_id, status)`, `proposals(created_by, status)`, `proposals(finalized_at)`.
- `lpjs(status)`, `lpjs(approved_at)`.
- `audit_logs(entity_type, entity_id)`, `audit_logs(at_timestamp DESC)`.

### Security & Privacy

- HTTPS wajib (Let's Encrypt di Nginx, auto-renewal cron).
- Password policy: min 10 char, mixed case + angka, bcrypt cost ≥ 12, rate limit login 5 percobaan / 5 menit.
- Session timeout 8 jam idle, force logout on password change.
- Role-based access control (RBAC): server-side authorization wajib di setiap API route, bukan hanya client-side guard.
- File upload: whitelist MIME (image/jpeg, image/png, application/pdf), max size enforced server-side, validasi filename untuk path traversal, simpan dengan UUID rename.
- Audit log untuk: login, finalisasi proposal, generate nomor, semua transisi LPJ, perubahan template.
- Backup: dump MySQL harian (mysqldump → gzip → rsync ke remote target) + rsync `/uploads` directory; retensi 30 hari; alert email kalau backup gagal.
- Tanda tangan: file path tersimpan di kolom terenkripsi AES-256; user dapat hapus tanda tangannya sendiri.
- VPS hardening: ufw firewall (allow 22, 80, 443 saja), SSH key only (disable password login), fail2ban, automatic security updates via unattended-upgrades.
- CSRF protection di Next.js Server Actions (built-in) dan custom check di legacy API routes.

### Performance Targets

- API p95 latency ≤ 500 ms (read), ≤ 1.5 s (write, di luar PDF generate).
- PDF generate ≤ 3 detik untuk proposal ≤ 10 halaman, ≤ 20 gambar.
- Concurrent users target v1.0: 50 simultan.
- Storage planning: ~50 MB per proposal lengkap dengan dokumentasi → plan 100 GB disk awal, alert pada 70%.

### VPS Sizing Rekomendasi MVP

- 4 vCPU, 8 GB RAM, 100 GB SSD (kebutuhan Puppeteer cukup berat, jangan dibawah ini).
- Alternatif minimal: 2 vCPU, 4 GB RAM + queue PDF jobs untuk hindari OOM.

---

## 5. Risks & Roadmap

### Phased Rollout

**MVP (v1.0) — Target 10 minggu**
- Auth + RBAC (3 role: manager / supervisor / admin).
- **Budget master**: kategori, periode, alokasi bulanan + bulk import CSV.
- **Proposal builder**: form terstruktur (template builder drag-and-drop di-defer ke v1.1; MVP pakai 1 template default hard-coded yang sudah cover field PRD), wajib link ke alokasi, save draft, finalize → generate PDF.
- Auto numbering dengan format configurable.
- **LPJ workflow**: Manager → Supervisor → Admin, posting realisasi otomatis ke alokasi saat approved.
- **Reallocation workflow**: transfer / topup / reversal dengan approval flow & snapshot.
- **Dashboard**: ringkasan alokasi vs penyerapan, chart kategori, quick lists.
- **Documentation gallery**: arsip foto & nota dengan filter.
- History page dengan filter, pagination, & ekspor CSV/XLSX.
- Email notifikasi (LPJ & reallocation transitions).
- Audit log untuk semua transisi state.
- Single-VPS deployment dengan Nginx + PM2 + MySQL.

**v1.1 — Target +4 minggu setelah MVP**
- **Template builder drag-and-drop** (dipindah dari MVP — di MVP pakai 1 template default).
- Migrasi file storage ke S3-compatible (MinIO / R2).
- Bulk export PDF (zip) per filter.
- Dashboard advanced: tren multi-bulan, forecast penyerapan.
- Audit log viewer untuk admin.
- Template versioning UI yang lebih baik (diff & rollback antar versi).
- Queue PDF generation (BullMQ + Redis) untuk handle concurrent finalize.
- Approval flow konfigurable per departemen.

**v2.0 — Target +8 minggu setelah v1.1**
- AI assist: OCR nota → auto-fill rincian transaksi LPJ.
- AI summary LPJ untuk supervisor.
- SSO (Google Workspace / Microsoft 365).
- Notifikasi in-app real-time (WebSocket).
- Multi-tenant readiness (org-scoped data + subdomain per org).
- Mobile PWA installable.

### Technical Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Puppeteer berat di VPS spec rendah → PDF lambat / OOM | High | Provision min 4 GB RAM + 2 vCPU, queue PDF jobs (BullMQ + Redis) di v1.1, cap concurrent renders ke 2. |
| Race condition di nomor proposal saat user finalize bersamaan | High | Transactional `SELECT … FOR UPDATE` + UNIQUE constraint, retry on conflict, integration test dengan parallel finalize. |
| Template JSON corrupt karena bug drag-and-drop → form tidak render | Medium | Schema validation dengan zod tiap save template, automatic backup snapshot per save, "rollback to previous version" dari admin. |
| Disk penuh karena uploads tidak dibersihkan (orphan files) | Medium | Cron weekly orphan cleanup berdasarkan referential integrity check, monitoring disk usage dengan alert 70%. |
| Backup gagal silent → data loss | Critical | Backup verification cron (test restore weekly ke staging dir), alert email kalau gagal, off-site copy. |
| Single-VPS = single point of failure | Medium | v1.1 pisahkan DB ke managed instance, snapshot harian dari provider VPS, dokumentasi DR runbook. |
| Tanda tangan upload bisa di-assign ke user lain | Medium | Tanda tangan terikat user_id di server, validasi cross-user di API, audit log perubahan signature. |
| Drag-and-drop builder UX kompleks → adopsi lambat | Medium | Sediakan 3–5 starter template siap pakai saat go-live, rekam video tutorial 5 menit, on-site training admin. |

### Open Questions / TBD

- Apakah perlu watermark "DRAFT" / "FINAL" / "CONFIDENTIAL" di PDF?
- Format penomoran pasti seperti apa? (perlu confirm ke admin / tim keuangan)
- Apakah supervisor perlu melihat draft proposal manager-nya, atau hanya yang final?
- Berapa user concurrent yang realistis untuk sizing VPS awal? (estimasi sekarang 50)
- Apakah perlu integrasi email kalender (.ics attachment) untuk tanggal pelaksanaan?
- Retention policy: berapa lama proposal & LPJ disimpan sebelum diarsipkan / dihapus?

---

## Next Steps

1. Review PRD ini bersama stakeholder (manager, supervisor, admin perwakilan) dan tutup Open Questions.
2. Konfirmasi format penomoran proposal final dan kebijakan retention dokumen.
3. Setelah approved, masuk ke fase: wireframe drag-and-drop builder + DB migration scripts + skeleton Next.js project.
4. Setup CI/CD pipeline ke VPS Ubuntu (GitHub Actions → SSH deploy via PM2 + zero-downtime reload).
5. Lock down sizing VPS final dan provision staging environment.
