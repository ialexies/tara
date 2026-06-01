'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const NAV = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/owners',
    label: 'Owners',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" />
      </svg>
    ),
  },
  {
    href: '/admin/properties',
    label: 'Properties',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Users',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/admin/reviews',
    label: 'Reviews',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path d="M12 2l2.9 6.1L22 9.2l-5 5 1.2 7L12 18l-6.2 3.2 1.2-7-5-5 7.1-1.1z" />
      </svg>
    ),
  },
  {
    href: '/admin/broadcast',
    label: 'Broadcast',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    href: '/admin/audit',
    label: 'Audit',
    exact: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export function AdminSidebar(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-[220px] flex-col border-r border-zinc-800 bg-zinc-900 md:flex dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-5">
        <Link href={`/${locale}/admin`} className="text-lg font-bold tracking-tight text-white">
          Tara Admin
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, exact, icon }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);
            return (
              <li key={href}>
                <Link
                  href={fullHref}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-l-2 border-emerald-500 bg-zinc-800 pl-[10px] text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {icon}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-4 py-4">
        <Link
          href={`/${locale}/dashboard`}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Owner Dashboard
        </Link>
      </div>
    </aside>
  );
}

const BOTTOM_NAV = [
  { href: '/admin', label: 'Dashboard', exact: true, icon: NAV[0].icon },
  { href: '/admin/owners', label: 'Owners', exact: false, icon: NAV[1].icon },
  { href: '/admin/bookings', label: 'Bookings', exact: false, icon: NAV[3].icon },
  { href: '/admin/properties', label: 'Properties', exact: false, icon: NAV[2].icon },
];

export function AdminBottomNav(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "more" sheet when navigating
  const isMoreActive = ['/admin/users', '/admin/reviews', '/admin/broadcast', '/admin/audit'].some(
    (h) => pathname.startsWith(`/${locale}${h}`),
  );

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex">
          {BOTTOM_NAV.map(({ href, label, exact, icon }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);
            return (
              <Link
                key={href}
                href={fullHref}
                onClick={() => setMoreOpen(false)}
                className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {icon}
                {label}
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isMoreActive || moreOpen
                ? 'text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            More
          </button>
        </div>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-[64px] rounded-t-2xl border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-3">
              {[NAV[4], NAV[5], NAV[6], NAV[7]].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={`/${locale}${href}`}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-100 p-3 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400"
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
