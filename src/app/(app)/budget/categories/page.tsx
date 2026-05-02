import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Textarea } from '@/components/ui/input';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { createCategory, toggleCategory } from '@/server/actions/categories';

export default async function CategoriesPage() {
  await requireRole('admin');
  const categories = await prisma.budgetCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const columns: Column[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Nama' },
    { key: 'description', label: 'Deskripsi' },
    { key: 'sortOrder', label: 'Urutan', align: 'center', width: 'w-20' },
    { key: 'active', label: 'Status', align: 'center' },
    { key: 'actions', label: '', align: 'right', sortable: false },
  ];

  const rows: Row[] = categories.map((c) => ({
    key: c.id,
    values: {
      code: c.code,
      name: c.name,
      description: c.description ?? '',
      sortOrder: c.sortOrder,
      active: c.active ? 1 : 0,
    },
    cells: {
      code: <span className="font-mono text-xs">{c.code}</span>,
      name: <span className="font-medium">{c.name}</span>,
      description: <span className="text-slate-500">{c.description ?? '-'}</span>,
      sortOrder: c.sortOrder,
      active: <Badge variant={c.active ? 'green' : 'gray'}>{c.active ? 'Aktif' : 'Non-aktif'}</Badge>,
      actions: (
        <form action={async () => { 'use server'; await toggleCategory(c.id); }} className="inline">
          <Button size="sm" variant="ghost">Toggle</Button>
        </form>
      ),
    },
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Kategori Budget"
        description="Kelola kategori dasar (mis. Promo Trade, Promo Konsumen, Program Edukasi)"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="Belum ada kategori. Tambahkan di form sebelah."
          defaultSort={{ key: 'sortOrder', dir: 'asc' }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Tambah Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCategory} className="space-y-4">
              <FormField label="Code" required hint="Singkat, kapital, mis. PROMO_TRADE">
                <Input name="code" required maxLength={20} placeholder="PROMO_TRADE" />
              </FormField>
              <FormField label="Nama" required>
                <Input name="name" required placeholder="Promo Trade" />
              </FormField>
              <FormField label="Deskripsi">
                <Textarea name="description" rows={2} />
              </FormField>
              <FormField label="Sort Order">
                <Input name="sortOrder" type="number" defaultValue={0} />
              </FormField>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked /> Aktif
              </label>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
