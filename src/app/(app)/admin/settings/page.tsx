import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { previewNumber } from '@/lib/numbering';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select } from '@/components/ui/input';

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

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Konfigurasi sistem (penomoran, dll)." />

      <Card>
        <CardHeader>
          <CardTitle>Penomoran Proposal</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Token: <code>{'{NO:nnnn}'}</code> · <code>{'{YYYY}'}</code> · <code>{'{MM}'}</code> · <code>{'{DD}'}</code> · <code>{'{TPL}'}</code> · <code>{'{DEPT}'}</code>
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateNumberingConfig} className="space-y-4">
            <FormField label="Format String" required>
              <Input name="formatString" defaultValue={cfg?.formatString ?? 'PRP/{TPL}/{NO:0000}/{MM}/{YYYY}'} required />
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
            <Button type="submit">Simpan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
