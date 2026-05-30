'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function BookingLookupPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ref = code.trim().toUpperCase();
    if (!ref) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/bookings/ref/${encodeURIComponent(ref)}`);
      if (res.status === 404) {
        setError('No booking found with that reference code. Double-check and try again.');
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { booking: { id: string } };
      router.push(`/${locale}/bookings/${data.booking.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <span className="text-4xl">🔍</span>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Find your booking
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter the reference code from your confirmation email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. TARA-ABC123"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center text-lg font-semibold uppercase tracking-widest text-zinc-900 placeholder-zinc-300 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              maxLength={12}
              autoFocus
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Looking up…' : 'Find booking'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Your reference code looks like <span className="font-mono">TARA-XXXXXX</span> and was
          included in your booking confirmation email.
        </p>
      </main>
    </div>
  );
}
