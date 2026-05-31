'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export function BottomNav(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();

  const tabs = [
    {
      href: `/${locale}/dashboard`,
      label: 'Home',
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
      href: `/${locale}/dashboard/bookings`,
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
      href: `/${locale}/dashboard/reviews`,
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
      href: `/${locale}/dashboard/profile`,
      label: 'Profile',
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
  ];

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white sm:hidden dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex">
        {tabs.map(({ href, label, exact, icon }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
            >
              {icon}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
