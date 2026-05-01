import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const u = await prisma.user.findUnique({ where: { email: 'admin@local' } });
console.log('User:', { id: u.id, email: u.email, role: u.role, active: u.active, hashLen: u.passwordHash.length });
console.log('Compare admin123:', await bcrypt.compare('admin123', u.passwordHash));
await prisma.$disconnect();
