'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  ClipboardCheck,
  Repeat2,
  Images,
  BarChart3,
  Settings,
  LogOut,
  Tag,
  CalendarRange,
  Users,
  UserCircle,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Role } from '@/types/enums';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/documentation', label: 'Documentation', icon: Images },
    ],
  },
  {
    label: 'Budget',
    items: [
      { href: '/budget/periods', label: 'Periode', icon: CalendarRange },
      { href: '/budget/categories', label: 'Kategori', icon: Tag, roles: ['admin'] },
      { href: '/reallocations', label: 'Reallocation', icon: Repeat2 },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { href: '/proposals', label: 'Proposal', icon: FileText },
      { href: '/lpj', label: 'LPJ', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
      { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null; role: Role; unreadCount?: number } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <Link href="/dashboard" className="block">
          <div className="text-base font-semibold text-blue-700">Business Plan</div>
          <div className="text-xs text-slate-500">Budget Manager</div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => !i.roles || i.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="px-3 pb-2">
          <div className="text-sm font-medium text-slate-900 truncate">{user.name ?? user.email}</div>
          <div className="text-xs text-slate-500 capitalize">{user.role}</div>
        </div>
        <Link
          href="/notifications"
          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </span>
          {user.unreadCount && user.unreadCount > 0 ? (
            <span className="rounded-full bg-blue-600 text-white text-xs px-1.5 py-0.5 min-w-5 text-center">{user.unreadCount}</span>
          ) : null}
        </Link>
        <Link
          href="/profile"
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          <UserCircle className="h-4 w-4" />
          Profile & Tanda Tangan
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
