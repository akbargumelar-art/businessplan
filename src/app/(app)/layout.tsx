import { requireUser } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  const navUser = { name: user.name, email: user.email, role: user.role, unreadCount };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={navUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={navUser} />
        {/* Full-width edge-to-edge — small padding only on the smallest screens */}
        <main className="flex-1 w-full px-3 py-4 sm:px-4 sm:py-5">{children}</main>
      </div>
    </div>
  );
}
