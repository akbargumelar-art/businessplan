'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(72),
  role: z.enum(['manager', 'supervisor', 'admin']),
  department: z.string().max(50).optional().nullable(),
  supervisorId: z.coerce.number().int().positive().optional().nullable(),
});

export async function createUser(formData: FormData) {
  const me = await requireRole('admin');
  const data = createSchema.parse({
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    role: formData.get('role'),
    department: formData.get('department') || null,
    supervisorId: formData.get('supervisorId') || null,
  });
  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
      department: data.department,
      supervisorId: data.supervisorId,
    },
  });
  await logAudit({ entity: 'user', entityId: created.id, action: 'create', actorId: me.id });
  revalidatePath('/admin/users');
}

export async function toggleUser(id: number) {
  const me = await requireRole('admin');
  if (id === me.id) throw new Error('Tidak bisa nonaktifkan diri sendiri');
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  await logAudit({ entity: 'user', entityId: id, action: u.active ? 'deactivate' : 'activate', actorId: me.id });
  revalidatePath('/admin/users');
}

export async function resetPassword(id: number, formData: FormData) {
  const me = await requireRole('admin');
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) throw new Error('Password minimal 8 karakter');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await logAudit({ entity: 'user', entityId: id, action: 'reset_password', actorId: me.id });
  revalidatePath('/admin/users');
}
