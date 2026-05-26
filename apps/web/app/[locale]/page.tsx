import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HealthCheckSchema, type HealthCheck } from '@tara/schemas';
import { getSession } from '@/lib/session';
import { SignOutButton } from './sign-out-button';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function fetchApiHealth(): Promise<HealthCheck | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const json = (await res.json()) as unknown;
    return HealthCheckSchema.parse(json);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const [health, session] = await Promise.all([fetchApiHealth(), getSession()]);
  const isHealthy = 'status' in health;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-16 sm:gap-8 sm:px-16 sm:py-32">
        <div className="flex items-baseline gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-black sm:text-6xl dark:text-zinc-50">
            {t('title')}
          </h1>
          <span className="text-xs uppercase tracking-widest text-zinc-400">v0</span>
        </div>

        <p className="max-w-md text-lg leading-relaxed text-zinc-700 sm:text-xl dark:text-zinc-300">
          {t('tagline')}
        </p>

        <p className="max-w-md text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
          {t('subtitle')}
        </p>

        <p className="text-sm italic text-zinc-400">{t('comingSoon')}</p>

        {/* Auth actions */}
        {session ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Signed in as{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">{session.email}</strong>
            </span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <a
              href={`/${locale}/login`}
              className="flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Sign in
            </a>
            <a
              href={`/${locale}/register`}
              className="flex h-11 items-center rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Create account
            </a>
          </div>
        )}

        {/* API health debug card */}
        <div className="mt-8 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{t('apiStatus')}</span>
          </div>
          <pre className="overflow-auto text-zinc-600 dark:text-zinc-400">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>

        {/* Locale switcher */}
        <nav className="mt-4 flex gap-3 text-xs">
          <a href="/en" className={locale === 'en' ? 'font-semibold' : 'text-zinc-500'}>
            English
          </a>
          <span className="text-zinc-300">·</span>
          <a href="/tl" className={locale === 'tl' ? 'font-semibold' : 'text-zinc-500'}>
            Tagalog
          </a>
        </nav>
      </div>
    </main>
  );
}
