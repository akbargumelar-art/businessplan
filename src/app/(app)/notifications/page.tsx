import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { markAllNotificationsRead, markNotificationRead } from '@/server/actions/notifications';

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="w-full">
      <PageHeader
        title="Notifikasi"
        description={unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
        actions={
          unreadCount > 0 ? (
            <form action={async () => { 'use server'; await markAllNotificationsRead(); }} className="inline">
              <Button size="sm" variant="outline">Mark all as read</Button>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState>Belum ada notifikasi.</EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-200">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`p-4 ${!n.readAt ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {!n.readAt && <Badge variant="blue">Baru</Badge>}
                        <span className="text-xs text-slate-500">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <div className="font-medium text-slate-900">{n.title}</div>
                      {n.body && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</div>}
                      {n.link && (
                        <Link href={n.link} className="text-sm text-blue-700 hover:underline mt-1 inline-block">
                          → Buka
                        </Link>
                      )}
                    </div>
                    {!n.readAt && (
                      <form action={async () => { 'use server'; await markNotificationRead(n.id); }} className="shrink-0">
                        <Button size="sm" variant="ghost">Tandai dibaca</Button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
