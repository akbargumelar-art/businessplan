import { prisma } from './prisma';
import type { OrgSettingsForPdf } from '@/components/pdf/proposal-pdf';

const DEFAULTS: OrgSettingsForPdf = {
  companyName: 'PT AGRABUDI KOMUNIKA',
  brandLine1: 'PROPOSAL',
  brandLine2: 'KEGIATAN PERMOHONAN BUDGET',
  brandLine3: 'CLUSTER CIREBON RAYA',
  logoText: 'AGRABUDI KOMUNIKA',
  defaultInstitution: 'PT AGRABUDI KOMUNIKA Cluster Cirebon Raya',
  defaultAddress: 'Jl. Siliwangi No. 196 Kelurahan Cigembang Kec. Kuningan Kab. Kuningan',
  defaultPhone: '0233-284555',
  vpName: 'Ahmad Barkah',
  vpTitle: 'Vice President',
  finDirName: 'Buldani',
  finDirTitle: 'Direktur Keuangan',
  defaultKantor: 'TAP Kuningan',
  defaultGmCluster: 'Firman Suhaeddy',
  defaultSignatureCity: 'Kuningan',
  approverSignaturePath: null,
  witnessSignaturePath: null,
  vpSignaturePath: null,
  finDirSignaturePath: null,
};

export async function getOrgSettings(): Promise<OrgSettingsForPdf> {
  const row = await prisma.organizationSettings.findFirst();
  if (!row) return DEFAULTS;
  return {
    companyName: row.companyName,
    brandLine1: row.brandLine1,
    brandLine2: row.brandLine2,
    brandLine3: row.brandLine3,
    logoText: row.logoText,
    defaultInstitution: row.defaultInstitution,
    defaultAddress: row.defaultAddress,
    defaultPhone: row.defaultPhone,
    vpName: row.vpName,
    vpTitle: row.vpTitle,
    finDirName: row.finDirName,
    finDirTitle: row.finDirTitle,
    defaultKantor: row.defaultKantor,
    defaultGmCluster: row.defaultGmCluster,
    defaultSignatureCity: row.defaultSignatureCity,
    approverSignaturePath: row.approverSignaturePath,
    witnessSignaturePath: row.witnessSignaturePath,
    vpSignaturePath: row.vpSignaturePath,
    finDirSignaturePath: row.finDirSignaturePath,
  };
}

export async function ensureOrgSettings() {
  const existing = await prisma.organizationSettings.findFirst();
  if (existing) return existing;
  return prisma.organizationSettings.create({ data: DEFAULTS });
}
