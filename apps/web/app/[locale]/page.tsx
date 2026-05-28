import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { SignOutButton } from './sign-out-button';
import { DashboardLink } from './dashboard-link';
import { PropertyListings, type Property } from './property-listings';
import { RecentBookings } from './recent-bookings';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const { city, type } = await searchParams;
  const base = 'Tara — Hostels in the Philippines';

  if (city && type) {
    const label = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    return {
      title: `${label} in ${city} | Tara`,
      description: `Book ${type}s in ${city}, Philippines. Find available rooms, dorms, and beds on Tara.`,
      openGraph: {
        title: `${label} in ${city}`,
        description: `Book ${type}s in ${city}, Philippines.`,
      },
    };
  }
  if (city) {
    return {
      title: `Hostels in ${city} | Tara`,
      description: `Find and book hostels, guesthouses, and rooms in ${city}, Philippines on Tara.`,
      openGraph: {
        title: `Hostels in ${city}`,
        description: `Book accommodation in ${city}, Philippines.`,
      },
    };
  }
  if (type) {
    const label = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    return {
      title: `${label} in the Philippines | Tara`,
      description: `Browse ${type}s across the Philippines. Book beds, dorms, and private rooms on Tara.`,
      openGraph: { title: label + ' in the Philippines', description: `Browse ${type}s on Tara.` },
    };
  }
  return {
    title: base,
    description:
      'Tara, na! Book beds, dorms, and private rooms at handpicked hostels across the Philippines.',
    openGraph: {
      title: base,
      description: 'Book hostels across the Philippines.',
      url: 'https://tara-stays.com/en',
    },
  };
}

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function fetchActiveProperties(): Promise<Property[]> {
  try {
    const res = await fetch(`${API_URL}/properties`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data: Property[] };
    return json.data;
  } catch {
    return [];
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const [properties, session, t, nav] = await Promise.all([
    fetchActiveProperties(),
    getSession(),
    getTranslations('home'),
    getTranslations('nav'),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4">
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Tara
          </span>
          <nav className="flex items-center gap-3">
            {session ? (
              <>
                {(session.role === 'owner' || session.role === 'admin') && (
                  <DashboardLink locale={locale} label={nav('dashboard')} />
                )}
                <Link
                  href={`/${locale}/bookings`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {nav('myBookings')}
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                {nav('signIn')}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
        </div>

        {/* Recent bookings for logged-in guests */}
        {session && <RecentBookings locale={locale} />}

        {/* Property listing with search/filter */}
        <PropertyListings properties={properties} locale={locale} />
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines ·{' '}
        <Link href={`/${locale}/terms`} className="hover:underline">
          Terms
        </Link>
        {' · '}
        <Link href={`/${locale}/privacy`} className="hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
