import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './prisma';
import { authConfig } from './auth.config';
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
  ...authConfig,
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
});
