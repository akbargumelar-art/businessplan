import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@/types/enums';

export const authConfig = {
  providers: [],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
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
} satisfies NextAuthConfig;
