import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select } from '@/components/ui/input';
import { DataTable, type Column, type Row } from '@/components/ui/data-table';
import { createUser, toggleUser } from '@/server/actions/users';

export default async function UsersPage() {
  await requireRole('admin');
  const users = await prisma.user.findMany({
    include: { supervisor: { select: { name: true } } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
  const supervisors = users.filter((u) => u.role === 'supervisor' || u.role === 'admin');

  const columns: Column[] = [
    { key: 'name', label: 'Nama / Email' },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Departemen' },
    { key: 'supervisor', label: 'Supervisor' },
    { key: 'active', label: 'Status' },
    { key: 'actions', label: '', sortable: false, align: 'right' },
  ];

  const rows: Row[] = users.map((u) => ({
    key: u.id,
    values: {
      name: u.name,
      role: u.role,
      department: u.department ?? '',
      supervisor: u.supervisor?.name ?? '',
      active: u.active ? 1 : 0,
    },
    cells: {
      name: (
        <div>
          <div className="font-medium">{u.name}</div>
          <div className="text-xs text-slate-500">{u.email}</div>
        </div>
      ),
      role: <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'supervisor' ? 'blue' : 'gray'}>{u.role}</Badge>,
      department: u.department ?? '-',
      supervisor: u.supervisor?.name ?? '-',
      active: <Badge variant={u.active ? 'green' : 'red'}>{u.active ? 'Aktif' : 'Non-aktif'}</Badge>,
      actions: (
        <form action={async () => { 'use server'; await toggleUser(u.id); }} className="inline">
          <Button size="sm" variant="ghost">Toggle</Button>
        </form>
      ),
    },
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Users" description="Kelola akun pengguna." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <DataTable columns={columns} rows={rows} emptyMessage="Belum ada user." />

        <Card>
          <CardHeader><CardTitle>Tambah User</CardTitle></CardHeader>
          <CardContent>
            <form action={createUser} className="space-y-4">
              <FormField label="Nama" required><Input name="name" required /></FormField>
              <FormField label="Email" required><Input name="email" type="email" required /></FormField>
              <FormField label="Password" required hint="Min 8 karakter"><Input name="password" type="password" required minLength={8} /></FormField>
              <FormField label="Role" required>
                <Select name="role" required defaultValue="manager">
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormField>
              <FormField label="Departemen"><Input name="department" /></FormField>
              <FormField label="Supervisor (opsional)">
                <Select name="supervisorId">
                  <option value="">— None —</option>
                  {supervisors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
