import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Textarea } from '@/components/ui/input';
import { createCategory, toggleCategory } from '@/server/actions/categories';

export default async function CategoriesPage() {
  await requireRole('admin');
  const categories = await prisma.budgetCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Kategori Budget"
        description="Kelola kategori dasar (mis. Promo Trade, Promo Konsumen, Program Edukasi)"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categories.length === 0 ? (
              <div className="p-5"><EmptyState>Belum ada kategori. Tambahkan di form sebelah.</EmptyState></div>
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Code</Th>
                    <Th>Nama</Th>
                    <Th>Deskripsi</Th>
                    <Th className="text-center">Status</Th>
                    <Th className="text-right">Aksi</Th>
                  </Tr>
                </THead>
                <TBody>
                  {categories.map((c) => (
                    <Tr key={c.id}>
                      <Td className="font-mono text-xs">{c.code}</Td>
                      <Td className="font-medium">{c.name}</Td>
                      <Td className="text-slate-500">{c.description ?? '-'}</Td>
                      <Td className="text-center">
                        <Badge variant={c.active ? 'green' : 'gray'}>{c.active ? 'Aktif' : 'Non-aktif'}</Badge>
                      </Td>
                      <Td className="text-right">
                        <form action={async () => { 'use server'; await toggleCategory(c.id); }} className="inline">
                          <Button size="sm" variant="ghost">Toggle</Button>
                        </form>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
