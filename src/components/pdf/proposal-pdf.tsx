import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Proposal, ProposalItem, BudgetAllocation, BudgetCategory, BudgetPeriod, User } from '@prisma/client';
import { formatIDR, formatDate } from '@/lib/format';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { marginBottom: 18, borderBottom: '2 solid #1e40af', paddingBottom: 8 },
  brand: { fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: 700, marginTop: 6, color: '#1e40af' },
  number: { fontSize: 11, color: '#1e40af', marginTop: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 8, textTransform: 'uppercase', color: '#64748b', marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 700 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 },
  para: { lineHeight: 1.45 },
  table: { borderTop: '1 solid #cbd5e1', borderLeft: '1 solid #cbd5e1', marginTop: 4 },
  row: { flexDirection: 'row', borderBottom: '1 solid #cbd5e1' },
  th: { padding: 5, fontWeight: 700, backgroundColor: '#f1f5f9', borderRight: '1 solid #cbd5e1' },
  td: { padding: 5, borderRight: '1 solid #cbd5e1' },
  cName: { width: '46%' },
  cQty: { width: '12%', textAlign: 'right' },
  cPrice: { width: '21%', textAlign: 'right' },
  cTotal: { width: '21%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', backgroundColor: '#eff6ff', fontWeight: 700 },
  signBlock: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  signCol: { width: '40%' },
  signLine: { borderBottom: '1 solid #475569', marginTop: 50, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#94a3b8', textAlign: 'center', borderTop: '1 solid #e2e8f0', paddingTop: 6 },
});

export function ProposalPdf({
  proposal,
}: {
  proposal: Proposal & {
    items: ProposalItem[];
    allocation: BudgetAllocation & { category: BudgetCategory; period: BudgetPeriod };
    createdBy: Pick<User, 'name' | 'email'>;
  };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{process.env.APP_NAME ?? 'Business Plan Manager'}</Text>
          <Text style={styles.title}>PROPOSAL PENGAJUAN BUDGET</Text>
          {proposal.number && <Text style={styles.number}>Nomor: {proposal.number}</Text>}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Judul Kegiatan</Text>
            <Text style={styles.metaValue}>{proposal.title}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Pelaksanaan</Text>
            <Text style={styles.metaValue}>{formatDate(proposal.eventStartDate)} – {formatDate(proposal.eventEndDate)}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Periode Budget</Text>
            <Text style={styles.metaValue}>{proposal.allocation.period.name}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Kategori</Text>
            <Text style={styles.metaValue}>{proposal.allocation.category.name}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Departemen</Text>
            <Text style={styles.metaValue}>{proposal.allocation.department ?? '-'}</Text>
          </View>
        </View>

        {proposal.objective && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objective</Text>
            <Text style={styles.para}>{proposal.objective}</Text>
          </View>
        )}

        {proposal.goal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal</Text>
            <Text style={styles.para}>{proposal.goal}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian Penyerapan Budget</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.th, styles.cName]}>Item</Text>
              <Text style={[styles.th, styles.cQty]}>Qty</Text>
              <Text style={[styles.th, styles.cPrice]}>Harga Satuan</Text>
              <Text style={[styles.th, styles.cTotal]}>Total</Text>
            </View>
            {proposal.items.map((it) => (
              <View key={it.id} style={styles.row}>
                <Text style={[styles.td, styles.cName]}>{it.name}</Text>
                <Text style={[styles.td, styles.cQty]}>{it.qty}</Text>
                <Text style={[styles.td, styles.cPrice]}>{formatIDR(it.unitPrice)}</Text>
                <Text style={[styles.td, styles.cTotal]}>{formatIDR(it.total)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.td, styles.cName]}>TOTAL</Text>
              <Text style={[styles.td, styles.cQty]}></Text>
              <Text style={[styles.td, styles.cPrice]}></Text>
              <Text style={[styles.td, styles.cTotal]}>{formatIDR(proposal.totalBudget)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signBlock}>
          <View style={styles.signCol}>
            <Text>Diajukan oleh,</Text>
            <View style={styles.signLine} />
            <Text style={{ fontWeight: 700 }}>{proposal.createdBy.name}</Text>
            <Text style={{ color: '#64748b', fontSize: 9 }}>{proposal.createdBy.email}</Text>
          </View>
          <View style={styles.signCol}>
            <Text>Mengetahui,</Text>
            <View style={styles.signLine} />
            <Text style={{ fontWeight: 700 }}>(Supervisor / Admin)</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dicetak otomatis oleh {process.env.APP_NAME ?? 'Business Plan Manager'} • {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  );
}
