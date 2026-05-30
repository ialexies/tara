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
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [ranging, setRanging] = useState(false);
  const [recurringDow, setRecurringDow] = useState<number[]>([]); // 0=Sun … 6=Sat
  const [recurringMonths, setRecurringMonths] = useState(3);
  const [recurring, setRecurring] = useState(false);

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
            Tap a date or block a range. Blocked dates won't accept new bookings.
          </p>
        </div>
      </div>

      {/* Recurring block */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-medium text-zinc-500">Block recurring days of the week</p>
        <div className="flex flex-wrap gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, dow) => (
            <button
              key={dow}
              onClick={() =>
                setRecurringDow((prev) =>
                  prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow],
                )
              }
              className={`h-9 rounded-full px-3 text-sm font-medium transition-colors ${
                recurringDow.includes(dow)
                  ? 'bg-red-500 text-white'
                  : 'border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={recurringMonths}
            onChange={(e) => setRecurringMonths(Number(e.target.value))}
            className="h-9 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {[1, 2, 3, 6].map((m) => (
              <option key={m} value={m}>
                {m} month{m > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <button
            disabled={recurringDow.length === 0 || recurring}
            onClick={async () => {
              setRecurring(true);
              try {
                const dates: string[] = [];
                const cursor = new Date();
                cursor.setDate(cursor.getDate() + 1);
                const end = new Date();
                end.setMonth(end.getMonth() + recurringMonths);
                while (cursor <= end) {
                  if (recurringDow.includes(cursor.getDay())) {
                    dates.push(isoDate(cursor));
                  }
                  cursor.setDate(cursor.getDate() + 1);
                }
                await Promise.all(dates.map((d) => api.bookings.setOwnerBlock(propertyId, d)));
                setBlocked((prev) => new Set([...prev, ...dates]));
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed');
              } finally {
                setRecurring(false);
              }
            }}
            className="flex h-9 items-center rounded-full bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
          >
            {recurring ? '…' : 'Block recurring'}
          </button>
        </div>
      </div>

      {/* Range block */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-medium text-zinc-500">Block a date range</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 items-center gap-2">
            <input
              type="date"
              value={rangeFrom}
              min={today}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <span className="shrink-0 text-zinc-400">→</span>
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom || today}
              onChange={(e) => setRangeTo(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <button
            disabled={!rangeFrom || !rangeTo || rangeTo < rangeFrom || ranging}
            onClick={async () => {
              setRanging(true);
              try {
                const dates: string[] = [];
                const cursor = new Date(rangeFrom);
                const end = new Date(rangeTo);
                while (cursor <= end) {
                  dates.push(isoDate(cursor));
                  cursor.setDate(cursor.getDate() + 1);
                }
                await Promise.all(dates.map((d) => api.bookings.setOwnerBlock(propertyId, d)));
                setBlocked((prev) => new Set([...prev, ...dates]));
                setRangeFrom('');
                setRangeTo('');
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed');
              } finally {
                setRanging(false);
              }
            }}
            className="flex h-11 items-center justify-center rounded-lg bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
          >
            {ranging ? '…' : 'Block range'}
          </button>
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
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {monthLabel(monthStart)}
          </p>
          <button
            onClick={() => setMonthStart((m) => addMonths(m, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
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
                  className={`flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-default ${
                    isPast
                      ? 'text-zinc-300 dark:text-zinc-700'
                      : isBlocked
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : date === today
                          ? 'bg-zinc-50 text-zinc-900 ring-2 ring-inset ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-500'
                          : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  } ${isActing ? 'opacity-50' : ''}`}
                >
                  {new Date(date + 'T00:00:00').getDate()}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-4 w-4 rounded bg-red-500" />
            Blocked
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-4 w-4 rounded bg-zinc-100 ring-2 ring-inset ring-zinc-400 dark:bg-zinc-800" />
            Today
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
