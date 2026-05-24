import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HealthCheckSchema, type HealthCheck } from '@tara/schemas';

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
  const health = await fetchApiHealth();
  const isHealthy = 'status' in health;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col items-start gap-8 px-8 py-20 sm:px-16 sm:py-32">
        <div className="flex items-baseline gap-2">
          <h1 className="text-6xl font-bold tracking-tight text-black dark:text-zinc-50">
            {t('title')}
          </h1>
          <span className="text-xs uppercase tracking-widest text-zinc-400">v0</span>
        </div>

        <p className="max-w-md text-xl leading-relaxed text-zinc-700 dark:text-zinc-300">
          {t('tagline')}
        </p>

        <p className="max-w-md text-base text-zinc-500 dark:text-zinc-400">
          {t('subtitle')}
        </p>

        <p className="text-sm italic text-zinc-400">{t('comingSoon')}</p>

        {/* API health debug card */}
        <div className="mt-8 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {t('apiStatus')}
            </span>
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
