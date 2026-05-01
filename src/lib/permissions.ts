import { auth } from './auth';
import type { Role } from '@/types/enums';
import { redirect } from 'next/navigation';

export type AuthUser = {
  id: number;
  email: string | null;
  name: string | null;
  role: Role;
  department: string | null;
};

export async function requireUser(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const u = session.user as { id: string; email?: string | null; name?: string | null; role?: Role; department?: string | null };
  if (!u.role) redirect('/login');
  return {
    id: Number(u.id),
    email: u.email ?? null,
    name: u.name ?? null,
    role: u.role,
    department: u.department ?? null,
  };
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: requires role ${roles.join(' or ')}`);
  }
  return user;
}

export function isAdmin(role: Role) {
  return role === 'admin';
}

export function isSupervisor(role: Role) {
  return role === 'supervisor';
}

export function canManageBudget(role: Role) {
  return role === 'admin' || role === 'supervisor';
}

export function canApproveLpj(role: Role, stage: 'supervisor' | 'admin') {
  if (stage === 'supervisor') return role === 'supervisor' || role === 'admin';
  return role === 'admin';
}

export function canApproveReallocation(role: Role, stage: 'supervisor' | 'admin') {
  return canApproveLpj(role, stage);
}
