'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './ui';
import {
  IconTrain, IconGrid, IconRoute, IconUpload, IconPlus, IconChart,
  IconMenu, IconX, IconArrowRight, IconSparkles,
} from './icons';

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  match: (path: string) => boolean;
};

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [{ href: '/', label: 'Dashboard', icon: IconGrid, match: (p) => p === '/' }],
  },
  {
    group: 'Manage',
    items: [
      {
        href: '/journeys',
        label: 'Journeys',
        icon: IconRoute,
        match: (p) => p === '/journeys' || (p.startsWith('/journeys/') && p !== '/journeys/new'),
      },
      { href: '/upload', label: 'Upload Ticket', icon: IconUpload, match: (p) => p.startsWith('/upload') },
      { href: '/journeys/new', label: 'Add Manually', icon: IconPlus, match: (p) => p.startsWith('/journeys/new') },
    ],
  },
  {
    group: 'Insights',
    items: [{ href: '/analytics', label: 'Analytics', icon: IconChart, match: (p) => p.startsWith('/analytics') }],
  },
];

function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
        <IconTrain className="text-[22px]" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-400 ring-2 ring-ink-950" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight text-white">Journey Monitor</span>
        <span className="block text-[11px] font-medium text-ink-400">Bangladesh Railway</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 no-scrollbar">
      {NAV_GROUPS.map((section) => (
        <div key={section.group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {section.group}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
                      : 'text-ink-400 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-brand" />
                  )}
                  <Icon
                    className={cn(
                      'text-[19px] transition-colors',
                      active ? 'text-brand-300' : 'text-ink-400 group-hover:text-brand-300',
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-4 shadow-glow">
        <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
        <IconSparkles className="text-[22px] text-white/90" />
        <p className="mt-2 text-sm font-semibold leading-snug text-white">
          Add your next journey in seconds
        </p>
        <Link
          href="/upload"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-brand-700 shadow-soft transition hover:bg-white"
        >
          Upload a ticket <IconArrowRight className="text-[14px]" />
        </Link>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen aurora-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/5 bg-ink-950 bg-gradient-to-b from-ink-900 via-ink-950 to-ink-950 lg:flex">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(99,102,241,0.28),transparent_70%)]" />
        <div className="relative flex h-[72px] items-center px-5">
          <BrandMark />
        </div>
        <NavLinks />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[280px] flex-col bg-ink-950 bg-gradient-to-b from-ink-900 to-ink-950 shadow-2xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-[72px] items-center justify-between px-5">
            <BrandMark />
            <button
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <IconX className="text-[20px]" />
            </button>
          </div>
          <NavLinks onNavigate={() => setOpen(false)} />
          <SidebarFooter />
        </aside>
      </div>

      {/* Main column */}
      <div className="lg:pl-[272px]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/60 bg-white/70 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 shadow-soft transition hover:bg-ink-50"
            aria-label="Open menu"
          >
            <IconMenu className="text-[20px]" />
          </button>
          <span className="text-sm font-bold tracking-tight text-ink-900">Journey Monitor</span>
          <span className="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
            <IconTrain className="text-[19px]" />
          </span>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
