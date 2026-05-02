import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { Proposal, ProposalItem, ProposalAttachment, BudgetAllocation, BudgetCategory, BudgetPeriod, User } from '@prisma/client';
import { formatIDR, formatDate, monthName, toNumber } from '@/lib/format';

export type OrgSettingsForPdf = {
  companyName: string;
  brandLine1: string;
  brandLine2: string;
  brandLine3?: string | null;
  logoText?: string | null;
  defaultInstitution?: string | null;
  defaultAddress?: string | null;
  defaultPhone?: string | null;
  vpName?: string | null;
  vpTitle?: string | null;
  finDirName?: string | null;
  finDirTitle?: string | null;
  defaultKantor?: string | null;
  defaultGmCluster?: string | null;
  defaultSignatureCity?: string | null;
  approverSignaturePath?: string | null;
  witnessSignaturePath?: string | null;
  vpSignaturePath?: string | null;
  finDirSignaturePath?: string | null;
};

const PROGRAM_TYPES = [
  'Diskon Produk', 'Pembelian Produk', 'Biaya Administrasi',
  'Subsidi Produk', 'Penjualan Piutang', 'Sharing Budget',
  'Support Produk', 'Budget Komitmen', 'Branding',
  'Kontrak Produk', '', 'Pengadaan Hadiah',
];

const styles = StyleSheet.create({
  page: { padding: 22, fontSize: 9, fontFamily: 'Helvetica', color: '#0f172a' },

  // Header
  header: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  brandTitle: { fontSize: 12, fontWeight: 700 },
  brandSub: { fontSize: 11, fontWeight: 700 },
  headerRight: { width: 150, alignItems: 'flex-end' },
  logoBox: {
    border: '1.5 solid #f97316',
    paddingHorizontal: 10, paddingVertical: 4,
    fontSize: 11, fontWeight: 700, color: '#f97316',
  },
  numberRow: { flexDirection: 'row', marginBottom: 3, fontSize: 9 },
  numberLabel: { width: 130, fontWeight: 700 },
  numberSep: { width: 10, textAlign: 'left' },

  // Section bar
  sectionBar: {
    backgroundColor: '#e5e7eb',
    border: '1 solid #94a3b8',
    paddingHorizontal: 4, paddingVertical: 2.5,
    fontWeight: 700, fontSize: 9.5,
  },
  sectionBarSpaced: {
    backgroundColor: '#e5e7eb',
    border: '1 solid #94a3b8',
    paddingHorizontal: 4, paddingVertical: 2.5,
    fontWeight: 700, fontSize: 9.5,
    marginTop: 4,
  },

  // Data rows (label : value table)
  dataRow: { flexDirection: 'row', borderLeft: '1 solid #94a3b8', borderRight: '1 solid #94a3b8', borderBottom: '1 solid #94a3b8' },
  labelCell: { width: 140, padding: 2.5, borderRight: '1 solid #94a3b8' },
  sepCell: { width: 10, padding: 2.5, borderRight: '1 solid #94a3b8', textAlign: 'center' },
  valueCell: { flex: 1, padding: 2.5 },
  valueCellBold: { flex: 1, padding: 2.5, fontWeight: 700 },

  // Program type checkbox grid (3 cols × 4 rows)
  ptGrid: { flexDirection: 'column' },
  ptRow: { flexDirection: 'row' },
  ptCell: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 1, paddingHorizontal: 2, gap: 4 },
  ptCheckbox: {
    width: 8, height: 8,
    border: '0.5 solid #475569',
    marginRight: 3,
  },
  ptCheckboxChecked: {
    width: 8, height: 8,
    border: '0.5 solid #475569',
    backgroundColor: '#0f172a',
    marginRight: 3,
  },
  ptText: { fontSize: 9 },

  // Signatures — compact for fit-on-page-1
  signaturesBlock: { marginTop: 10 },
  signRow: { flexDirection: 'row', gap: 10 },
  signRow2: { flexDirection: 'row', gap: 10, marginTop: 14 },
  signCol3: { flex: 1, alignItems: 'center' },
  signColEmpty: { flex: 1 },
  signLabel: { fontSize: 9, marginBottom: 1 },
  signSpace: { height: 28 },
  signImage: { height: 36, width: 80, objectFit: 'contain', marginVertical: -4 },
  signName: { fontSize: 9, fontWeight: 700, textDecoration: 'underline' },
  signTitle: { fontSize: 8.5, marginTop: 1 },

  cityDate: { marginTop: 8, marginBottom: 3, textAlign: 'left' },

  // Page 2
  attTable: { borderTop: '1 solid #94a3b8', borderLeft: '1 solid #94a3b8' },
  attHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f5f9' },
  attHeaderCell: { flex: 1, padding: 5, fontWeight: 700, borderRight: '1 solid #94a3b8', borderBottom: '1 solid #94a3b8', textAlign: 'center' },
  attBodyRow: { flexDirection: 'row', minHeight: 130 },
  attBodyCell: { flex: 1, padding: 5, borderRight: '1 solid #94a3b8', borderBottom: '1 solid #94a3b8', justifyContent: 'center', alignItems: 'center' },
  attImage: { maxHeight: 120, maxWidth: '100%', objectFit: 'contain' },
  placeholderText: { fontSize: 8, color: '#94a3b8', textAlign: 'center' },

  breakdown: { marginTop: 16 },
  breakdownRow: { flexDirection: 'row', paddingVertical: 1.5 },
  breakdownLabel: { flex: 1, fontSize: 9 },
  breakdownLabelBold: { flex: 1, fontSize: 9, fontWeight: 700 },
  breakdownLabelIndent: { flex: 1, fontSize: 9, paddingLeft: 80, color: '#475569' },
  breakdownValue: { width: 100, fontSize: 9, textAlign: 'right' },
  breakdownValueBold: { width: 100, fontSize: 9, fontWeight: 700, textAlign: 'right', borderTop: '0.5 solid #94a3b8', paddingTop: 2, marginTop: 2 },
});

function pickPrograms(types: string | null | undefined): Set<string> {
  if (!types) return new Set();
  return new Set(types.split(',').map((t) => t.trim()).filter(Boolean));
}

function fmtTanggalIndo(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getDate()} ${monthName(date.getMonth() + 1)} ${date.getFullYear()}`;
}

function fmtPelaksanaan(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) return fmtTanggalIndo(start);
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${monthName(start.getMonth() + 1)} ${start.getFullYear()}`;
  }
  return `${fmtTanggalIndo(start)} – ${fmtTanggalIndo(end)}`;
}

export function ProposalPdf({
  proposal,
  org,
  attachmentBase,
}: {
  proposal: Proposal & {
    items: ProposalItem[];
    attachments: ProposalAttachment[];
    allocation: BudgetAllocation & { category: BudgetCategory; period: BudgetPeriod };
    createdBy: Pick<User, 'name' | 'email' | 'signatureImagePath'>;
  };
  org: OrgSettingsForPdf;
  attachmentBase: string; // absolute base, e.g. "http://localhost:3000"
}) {
  const ktp = proposal.attachments.find((a) => a.label === 'KTP' && a.fileType.startsWith('image/'));
  const passPhoto = proposal.attachments.find((a) => a.label === 'Pass Photo' && a.fileType.startsWith('image/'));
  const wokAttachment = proposal.attachments.find((a) => a.label === 'WoK');
  const wokIsImage = wokAttachment?.fileType.startsWith('image/');
  const wokText = !wokIsImage ? (proposal.applicantAddress ?? '-') : null;
  const toImageSrc = (filePath: string) => `${attachmentBase}${filePath}`;
  const checked = pickPrograms(proposal.programType);
  const total = toNumber(proposal.totalBudget);
  const tanggalPengajuan = proposal.finalizedAt ?? proposal.createdAt;
  const sumberBudget = `Business Plan ${monthName(proposal.allocation.period.month ?? new Date().getMonth() + 1)} ${proposal.allocation.period.year} - ${proposal.allocation.category.name}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandTitle}>{org.brandLine1}</Text>
            <Text style={styles.brandSub}>{org.brandLine2}</Text>
            {org.brandLine3 && <Text style={styles.brandSub}>{org.brandLine3}</Text>}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.logoBox}>
              <Text>{org.logoText ?? org.companyName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.numberRow}>
          <Text style={styles.numberLabel}>PROPOSAL NUMBER</Text>
          <Text style={styles.numberSep}>:</Text>
          <Text>{proposal.number ?? '(belum di-finalize)'}</Text>
        </View>

        {/* DATA PEMOHON */}
        <Text style={styles.sectionBar}>DATA PEMOHON</Text>
        <DataRowKV label="Tanggal Pengajuan" value={fmtTanggalIndo(tanggalPengajuan)} />
        <DataRowKV label="Kantor" value={proposal.kantor ?? org.defaultKantor ?? '-'} />
        <DataRowKV label="GM Cluster" value={proposal.gmClusterName ?? org.defaultGmCluster ?? '-'} />

        {/* DATA PROGRAM KEGIATAN */}
        <Text style={styles.sectionBarSpaced}>DATA PROGRAM KEGIATAN</Text>
        <DataRowKV label="Nama Program" value={proposal.title} bold />
        <DataRowKV label="Tanggal Pelaksanaan" value={fmtPelaksanaan(proposal.eventStartDate, proposal.eventEndDate)} />

        {/* Jenis Program — checkbox grid */}
        <View style={styles.dataRow}>
          <View style={styles.labelCell}><Text>Jenis Program</Text></View>
          <View style={styles.sepCell}><Text>:</Text></View>
          <View style={styles.valueCell}>
            <View style={styles.ptGrid}>
              {[0, 1, 2, 3].map((rowIdx) => (
                <View style={styles.ptRow} key={rowIdx}>
                  {[0, 1, 2].map((colIdx) => {
                    const i = rowIdx * 3 + colIdx;
                    const label = PROGRAM_TYPES[i] ?? '';
                    if (!label) return <View style={styles.ptCell} key={colIdx} />;
                    const isChecked = checked.has(label);
                    return (
                      <View style={styles.ptCell} key={colIdx}>
                        <View style={isChecked ? styles.ptCheckboxChecked : styles.ptCheckbox} />
                        <Text style={styles.ptText}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>

        <DataRowKV label="Tujuan Program" value={proposal.objective ?? '-'} />
        <DataRowKV label="Deskripsi Program" value={proposal.description ?? proposal.goal ?? '-'} multiline />

        {/* DATA BUDGET */}
        <Text style={styles.sectionBarSpaced}>DATA BUDGET</Text>
        <DataRowKV label="Sumber Budget" value={sumberBudget} bold />
        <DataRowKV label="Jumlah Budget" value={formatIDR(total).replace('Rp', 'Rp.')} bold />
        <DataRowKV label="Rencana Penggunaan" value={formatIDR(total).replace('Rp', 'Rp.')} bold />
        <DataRowKV label="Sisa Budget" value="Rp. 0" bold />
        <DataRowKV label="Deskripsi penggunaan budget" value={proposal.usageNote ?? '-'} bold />

        {/* DATA PRODUK */}
        <Text style={styles.sectionBarSpaced}>DATA PRODUK</Text>
        <View style={styles.dataRow}>
          <View style={styles.labelCell}><Text>Jumlah dan keterangan produk</Text></View>
          <View style={styles.sepCell}><Text></Text></View>
          <View style={styles.valueCell}>
            {(proposal.productInfo ?? `Total: ${formatIDR(total)}`)
              .split('\n')
              .map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
          </View>
        </View>

        {/* KETERANGAN / DATA SUBJECT */}
        <Text style={styles.sectionBarSpaced}>KETERANGAN / DATA SUBJECT</Text>
        <DataRowKV label="Nama" value={proposal.applicantName ?? proposal.createdBy.name} />
        <DataRowKV label="Perusahaan / Instansi" value={org.defaultInstitution ?? org.companyName} />
        <DataRowKV label="Alamat" value={proposal.applicantAddress ?? org.defaultAddress ?? '-'} />
        <DataRowKV label="No TLP / HP" value={proposal.applicantPhone ?? org.defaultPhone ?? '-'} />

        {/* TANGGAL & TANDA TANGAN — keep all together via wrap={false} */}
        <View style={styles.signaturesBlock} wrap={false}>
          <Text style={styles.cityDate}>
            {proposal.signatureCity ?? org.defaultSignatureCity ?? 'Kota'}, {fmtTanggalIndo(tanggalPengajuan)}
          </Text>

          {/* Row 1: 3 signatures */}
          <View style={styles.signRow}>
            <View style={styles.signCol3}>
              <Text style={styles.signLabel}>Dibuat Oleh,</Text>
              {proposal.createdBy.signatureImagePath ? (
                <Image src={toImageSrc(proposal.createdBy.signatureImagePath)} style={styles.signImage} />
              ) : (
                <View style={styles.signSpace} />
              )}
              <Text style={styles.signName}>{proposal.createdBy.name}</Text>
              <Text style={styles.signTitle}>Manager Support {proposal.kantor ? proposal.kantor.replace(/^TAP\s+/i, '') : 'Cirebon Raya'}</Text>
            </View>
            <View style={styles.signCol3}>
              <Text style={styles.signLabel}>Menyetujui,</Text>
              {org.approverSignaturePath ? (
                <Image src={toImageSrc(org.approverSignaturePath)} style={styles.signImage} />
              ) : (
                <View style={styles.signSpace} />
              )}
              <Text style={styles.signName}>{proposal.approverName ?? org.defaultGmCluster ?? '(approver)'}</Text>
              <Text style={styles.signTitle}>{proposal.approverTitle ?? 'Manager Cluster'}</Text>
            </View>
            <View style={styles.signCol3}>
              <Text style={styles.signLabel}>Mengetahui,</Text>
              {org.witnessSignaturePath ? (
                <Image src={toImageSrc(org.witnessSignaturePath)} style={styles.signImage} />
              ) : (
                <View style={styles.signSpace} />
              )}
              <Text style={styles.signName}>{proposal.witnessName ?? '(witness)'}</Text>
              <Text style={styles.signTitle}>{proposal.witnessTitle ?? 'SPV MCOT'}</Text>
            </View>
          </View>

          {/* Row 2: VP & Direktur Keuangan — posisi kolom 1 & 2 (kolom 3 kosong) */}
          {(org.vpName || org.finDirName) && (
            <View style={styles.signRow2}>
              <View style={styles.signCol3}>
                <Text style={styles.signLabel}>Mengetahui,</Text>
                {org.vpSignaturePath ? (
                  <Image src={toImageSrc(org.vpSignaturePath)} style={styles.signImage} />
                ) : (
                  <View style={styles.signSpace} />
                )}
                <Text style={styles.signName}>{org.vpName ?? '-'}</Text>
                <Text style={styles.signTitle}>{org.vpTitle ?? 'Vice President'}</Text>
              </View>
              <View style={styles.signCol3}>
                <Text style={styles.signLabel}>Mengetahui,</Text>
                {org.finDirSignaturePath ? (
                  <Image src={toImageSrc(org.finDirSignaturePath)} style={styles.signImage} />
                ) : (
                  <View style={styles.signSpace} />
                )}
                <Text style={styles.signName}>{org.finDirName ?? '-'}</Text>
                <Text style={styles.signTitle}>{org.finDirTitle ?? 'Direktur Keuangan'}</Text>
              </View>
              <View style={styles.signColEmpty} />
            </View>
          )}
        </View>
      </Page>

      {/* PAGE 2 — Lampiran (KTP / Pass Photo / WoK + breakdown) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.attTable}>
          <View style={styles.attHeaderRow}>
            <Text style={styles.attHeaderCell}>Photo KTP</Text>
            <Text style={styles.attHeaderCell}>Pass Photo</Text>
            <Text style={styles.attHeaderCell}>WoK</Text>
          </View>
          <View style={styles.attBodyRow}>
            <View style={styles.attBodyCell}>
              {ktp ? (
                <Image src={toImageSrc(ktp.filePath)} style={styles.attImage} />
              ) : (
                <Text style={styles.placeholderText}>(belum upload)</Text>
              )}
            </View>
            <View style={styles.attBodyCell}>
              {passPhoto ? (
                <Image src={toImageSrc(passPhoto.filePath)} style={styles.attImage} />
              ) : (
                <Text style={styles.placeholderText}>(belum upload)</Text>
              )}
            </View>
            <View style={styles.attBodyCell}>
              {wokIsImage && wokAttachment ? (
                <Image src={toImageSrc(wokAttachment.filePath)} style={styles.attImage} />
              ) : (
                <Text>{wokText ?? '-'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Breakdown table — render only if items exist */}
        {proposal.items.length > 0 && (
          <View style={styles.breakdown}>
            {proposal.items.map((it) => (
              <View key={it.id}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabelBold}>{it.name}</Text>
                  <Text style={styles.breakdownValue}>{Number(it.total).toLocaleString('id-ID')}</Text>
                </View>
                {it.qty > 1 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabelIndent}>Qty × Harga</Text>
                    <Text style={styles.breakdownValue}>{it.qty} × {Number(it.unitPrice).toLocaleString('id-ID')}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabelBold}>Take Homepay</Text>
              <Text style={styles.breakdownValueBold}>{Number(total).toLocaleString('id-ID')}</Text>
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

function DataRowKV({ label, value, bold, multiline }: { label: string; value: string; bold?: boolean; multiline?: boolean }) {
  const lines = multiline ? value.split('\n') : [value];
  return (
    <View style={styles.dataRow}>
      <View style={styles.labelCell}><Text>{label}</Text></View>
      <View style={styles.sepCell}><Text>:</Text></View>
      <View style={bold ? styles.valueCellBold : styles.valueCell}>
        {lines.map((line, i) => <Text key={i}>{line}</Text>)}
      </View>
    </View>
  );
}
