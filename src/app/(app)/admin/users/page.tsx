import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, THead, TBody, Tr, Th, Td, EmptyState } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, FormField, Select } from '@/components/ui/input';
import { createUser, toggleUser } from '@/server/actions/users';

export default async function UsersPage() {
  await requireRole('admin');
  const users = await prisma.user.findMany({
    include: { supervisor: { select: { name: true } } },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
  const supervisors = users.filter((u) => u.role === 'supervisor' || u.role === 'admin');

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Users" description="Kelola akun pengguna." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Daftar User</CardTitle></CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-5"><EmptyState>Belum ada user.</EmptyState></div>
            ) : (
              <Table>
                <THead>
                  <Tr>
                    <Th>Nama / Email</Th>
                    <Th>Role</Th>
                    <Th>Departemen</Th>
                    <Th>Supervisor</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </Tr>
                </THead>
                <TBody>
                  {users.map((u) => (
                    <Tr key={u.id}>
                      <Td>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </Td>
                      <Td><Badge variant={u.role === 'admin' ? 'purple' : u.role === 'supervisor' ? 'blue' : 'gray'}>{u.role}</Badge></Td>
                      <Td>{u.department ?? '-'}</Td>
                      <Td>{u.supervisor?.name ?? '-'}</Td>
                      <Td><Badge variant={u.active ? 'green' : 'red'}>{u.active ? 'Aktif' : 'Non-aktif'}</Badge></Td>
                      <Td className="text-right">
                        <form action={async () => { 'use server'; await toggleUser(u.id); }} className="inline">
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
