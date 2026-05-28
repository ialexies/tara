'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  return r;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

export default function BlockedDatesPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();

  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = isoDate(monthStart);
  const to = isoDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));

  const load = useCallback(() => {
    setLoading(true);
    api.bookings
      .ownerBlocks(propertyId, from, to)
      .then((res) => setBlocked(new Set(res.data)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDate(date: string) {
    setActing(date);
    try {
      if (blocked.has(date)) {
        await api.bookings.deleteOwnerBlock(propertyId, date);
        setBlocked((prev) => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
      } else {
        await api.bookings.setOwnerBlock(propertyId, date);
        setBlocked((prev) => new Set([...prev, date]));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const today = isoDate(new Date());
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const days: (string | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= totalDays; d++) {
    days.push(isoDate(new Date(year, month, d)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard/properties/${propertyId}/rooms`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Rooms
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Blocked dates</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tap a date to block or unblock it. Blocked dates won't accept new bookings.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setMonthStart((m) => addMonths(m, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {monthLabel(monthStart)}
          </p>
          <button
            onClick={() => setMonthStart((m) => addMonths(m, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
          >
            ›
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-xs font-medium text-zinc-400">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const isBlocked = blocked.has(date);
              const isPast = date < today;
              const isActing = acting === date;
              return (
                <button
                  key={date}
                  onClick={() => !isPast && toggleDate(date)}
                  disabled={isPast || isActing}
                  className={`flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-default ${
                    isPast
                      ? 'text-zinc-300 dark:text-zinc-700'
                      : isBlocked
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  } ${isActing ? 'opacity-50' : ''}`}
                >
                  {new Date(date + 'T00:00:00').getDate()}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-4 w-4 rounded bg-red-500" />
            Blocked
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-4 w-4 rounded bg-zinc-100 dark:bg-zinc-800" />
            Available
          </div>
        </div>
      </div>
    </div>
  );
}
