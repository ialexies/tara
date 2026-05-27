import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { SignOutButton } from './sign-out-button';
import { PropertyListings, type Property } from './property-listings';

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

  const [properties, session] = await Promise.all([fetchActiveProperties(), getSession()]);

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
                  <Link
                    href={`/${locale}/dashboard`}
                    className="flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href={`/${locale}/bookings`}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  My bookings
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link
                href={`/${locale}/login`}
                className="flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Hostels in the Philippines
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Book beds, dorms, and private rooms at handpicked hostels.
          </p>
        </div>

        {/* Property listing with search/filter */}
        <PropertyListings properties={properties} locale={locale} />
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines
      </footer>
    </div>
  );
}
