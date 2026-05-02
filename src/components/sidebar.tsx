'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
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
  ChevronLeft,
  ChevronRight,
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

const COLLAPSED_KEY = 'bp.sidebar.collapsed';

export function Sidebar({ user }: { user: { name?: string | null; email?: string | null; role: Role; unreadCount?: number } }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(COLLAPSED_KEY);
    setCollapsed(v === '1');
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }

  const widthClass = collapsed ? 'lg:w-16' : 'lg:w-64';

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col transition-[width] duration-200',
        widthClass,
      )}
      data-hydrated={hydrated}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3.5">
        <Link href="/dashboard" className={cn('block min-w-0 flex-1', collapsed && 'hidden')}>
          <div className="text-base font-semibold text-blue-700 truncate">Business Plan</div>
          <div className="text-xs text-slate-500 truncate">Budget Manager</div>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {navGroups.map((group) => {
          const visible = group.items.filter((i) => !i.roles || i.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-base transition-colors',
                          collapsed && 'justify-center px-2',
                          active
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-100',
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-2 py-2">
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="text-sm font-medium text-slate-900 truncate">{user.name ?? user.email}</div>
            <div className="text-xs text-slate-500 capitalize">{user.role}</div>
          </div>
        )}
        <Link
          href="/notifications"
          title={collapsed ? 'Notifikasi' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-base text-slate-600 hover:bg-slate-100',
            collapsed ? 'justify-center px-2' : 'justify-between',
          )}
        >
          <span className="flex items-center gap-3">
            <Bell className="h-5 w-5 shrink-0" />
            {!collapsed && 'Notifikasi'}
          </span>
          {user.unreadCount && user.unreadCount > 0 ? (
            <span className={cn(
              'rounded-full bg-blue-600 text-white text-xs px-1.5 min-w-[1.25rem] text-center leading-5 font-semibold',
            )}>
              {user.unreadCount}
            </span>
          ) : null}
        </Link>
        <Link
          href="/profile"
          title={collapsed ? 'Profile' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-base text-slate-600 hover:bg-slate-100',
            collapsed && 'justify-center px-2',
          )}
        >
          <UserCircle className="h-5 w-5 shrink-0" />
          {!collapsed && 'Profile'}
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ redirectTo: '/login' })}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-base text-slate-600 hover:bg-slate-100',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
