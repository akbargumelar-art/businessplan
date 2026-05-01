import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './prisma';
import type { Role } from '@/types/enums';

declare module 'next-auth' {
  interface User {
    role?: Role;
    department?: string | null;
  }
}

// Session.user.id is `string` by default in NextAuth — we re-export typed helpers below.


const credsSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = credsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.active) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as Role,
          department: user.department,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { id?: string; role?: Role; department?: string | null };
        (token as Record<string, unknown>).id = Number(u.id);
        (token as Record<string, unknown>).role = u.role;
        (token as Record<string, unknown>).department = u.department ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        const t = token as Record<string, unknown>;
        // We keep id as string for compat with NextAuth default type;
        // permissions.requireUser() converts to number.
        session.user.id = String(t.id);
        (session.user as { role?: Role }).role = t.role as Role;
        (session.user as { department?: string | null }).department = (t.department as string | null | undefined) ?? null;
      }
      return session;
    },
    authorized: async ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isPublic = pathname === '/login' || pathname.startsWith('/api/auth');
      if (isPublic) return true;
      return !!auth;
    },
  },
});
