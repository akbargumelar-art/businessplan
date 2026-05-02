import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { previewNumber } from '@/lib/numbering';
import { ensureOrgSettings } from '@/lib/org';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select, Textarea } from '@/components/ui/input';
import { updateOrgSettings } from '@/server/actions/org';
import { OrgSignatureUploads } from '@/components/org-signature-uploads';
import { OrgLogoUpload } from '@/components/org-logo-upload';

async function updateNumberingConfig(formData: FormData) {
  'use server';
  await requireRole('admin');
  const formatString = String(formData.get('formatString') ?? '');
  const resetPeriod = String(formData.get('resetPeriod') ?? 'year') as 'never' | 'year' | 'month';

  await prisma.numberingConfig.upsert({
    where: { name: 'proposal' },
    update: { formatString, resetPeriod },
    create: { name: 'proposal', formatString, resetPeriod, currentSequence: 0 },
  });
  revalidatePath('/admin/settings');
}

export default async function SettingsPage() {
  await requireRole('admin');

  const cfg = await prisma.numberingConfig.findUnique({ where: { name: 'proposal' } });
  const sample = previewNumber(cfg?.formatString ?? 'PRP/{TPL}/{NO:0000}/{MM}/{YYYY}', { sequence: 42, date: new Date() }, { TPL: 'EVT' });

  const org = await ensureOrgSettings();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Settings" description="Konfigurasi sistem (penomoran, identitas perusahaan)." />

      <Card>
        <CardHeader>
          <CardTitle>Penomoran Proposal</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Token: <code>{'{NO:nnnn}'}</code> · <code>{'{YYYY}'}</code> · <code>{'{MM}'}</code> · <code>{'{ROMAN}'}</code> · <code>{'{DD}'}</code> · <code>{'{TPL}'}</code> · <code>{'{DEPT}'}</code>
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateNumberingConfig} className="space-y-4">
            <FormField label="Format String" required hint="contoh: 15/ABK-CRB/BP/IV/4/2026 → {NO}/ABK-CRB/BP/{ROMAN}/{MM}/{YYYY}">
              <Input name="formatString" defaultValue={cfg?.formatString ?? '{NO}/ABK-CRB/BP/{ROMAN}/{MM}/{YYYY}'} required />
            </FormField>
            <FormField label="Reset Period">
              <Select name="resetPeriod" defaultValue={cfg?.resetPeriod ?? 'year'}>
                <option value="never">Never</option>
                <option value="year">Per Tahun</option>
                <option value="month">Per Bulan</option>
              </Select>
            </FormField>
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm">
              <div className="text-xs uppercase text-slate-500">Preview</div>
              <div className="font-mono text-blue-700 mt-1">{sample}</div>
            </div>
            <Button type="submit">Simpan Format Penomoran</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Perusahaan (PDF Header & Signature)</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Field yang muncul di PDF proposal — header, info perusahaan, dan tanda tangan default.
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateOrgSettings} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Nama Perusahaan" required>
                <Input name="companyName" required defaultValue={org.companyName} />
              </FormField>
              <FormField label="Logo Text" hint="Text di kotak kanan atas">
                <Input name="logoText" defaultValue={org.logoText ?? ''} placeholder="AGRABUDI KOMUNIKA" />
              </FormField>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <FormField label="Brand Line 1" required>
                <Input name="brandLine1" required defaultValue={org.brandLine1} placeholder="PROPOSAL" />
              </FormField>
              <FormField label="Brand Line 2" required>
                <Input name="brandLine2" required defaultValue={org.brandLine2} placeholder="KEGIATAN PERMOHONAN BUDGET" />
              </FormField>
              <FormField label="Brand Line 3">
                <Input name="brandLine3" defaultValue={org.brandLine3 ?? ''} placeholder="CLUSTER CIREBON RAYA" />
              </FormField>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Default Kantor">
                <Input name="defaultKantor" defaultValue={org.defaultKantor ?? ''} placeholder="TAP Kuningan" />
              </FormField>
              <FormField label="Default GM Cluster">
                <Input name="defaultGmCluster" defaultValue={org.defaultGmCluster ?? ''} placeholder="Firman Suhaeddy" />
              </FormField>
            </div>

            <FormField label="Perusahaan / Instansi (Data Subject)">
              <Input name="defaultInstitution" defaultValue={org.defaultInstitution ?? ''} placeholder="PT AGRABUDI KOMUNIKA Cluster Cirebon Raya" />
            </FormField>

            <FormField label="Alamat Default">
              <Textarea name="defaultAddress" rows={2} defaultValue={org.defaultAddress ?? ''} />
            </FormField>

            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="No TLP / HP Default">
                <Input name="defaultPhone" defaultValue={org.defaultPhone ?? ''} placeholder="0233-284555" />
              </FormField>
              <FormField label="Default Kota TTD">
                <Input name="defaultSignatureCity" defaultValue={org.defaultSignatureCity ?? ''} placeholder="Kuningan" />
              </FormField>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="text-sm font-medium text-slate-700 mb-3">Tanda Tangan Tetap (baris kedua di PDF)</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Vice President — Nama">
                  <Input name="vpName" defaultValue={org.vpName ?? ''} placeholder="Ahmad Barkah" />
                </FormField>
                <FormField label="Vice President — Jabatan">
                  <Input name="vpTitle" defaultValue={org.vpTitle ?? 'Vice President'} />
                </FormField>
                <FormField label="Direktur Keuangan — Nama">
                  <Input name="finDirName" defaultValue={org.finDirName ?? ''} placeholder="Buldani" />
                </FormField>
                <FormField label="Direktur Keuangan — Jabatan">
                  <Input name="finDirTitle" defaultValue={org.finDirTitle ?? 'Direktur Keuangan'} />
                </FormField>
              </div>
            </div>

            <Button type="submit">Simpan Identitas Perusahaan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo Perusahaan (PDF Header)</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Upload logo untuk muncul di kanan atas PDF proposal. Kalau kosong,
            PDF pakai &ldquo;Logo Text&rdquo; di atas.
          </p>
        </CardHeader>
        <CardContent>
          <OrgLogoUpload existing={org.logoImagePath} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanda Tangan Digital — Pejabat Tetap</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Upload sekali, otomatis di-embed di semua PDF proposal.
            Idealnya PNG dengan background transparan, ukuran ~200×80 px.
          </p>
        </CardHeader>
        <CardContent>
          <OrgSignatureUploads
            signatures={{
              approver: org.approverSignaturePath,
              witness: org.witnessSignaturePath,
              vp: org.vpSignaturePath,
              finDir: org.finDirSignaturePath,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
