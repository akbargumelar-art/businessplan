'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';

export async function markNotificationRead(id: number) {
  const user = await requireUser();
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== user.id) return;
  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
}
