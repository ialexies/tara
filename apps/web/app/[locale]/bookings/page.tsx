'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type BookingRow = {
  booking: {
    id: string;
    referenceCode: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    status: string;
    totalMinor: number;
    currency: string;
    createdAt: string;
  };
  propertyName: string;
  propertySlug: string;
  propertyCity: string;
  roomName: string;
};

const STATUS_COLOURS: Record<string, string> = {
  manual_pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  awaiting_verification: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  checked_in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  checked_out: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  disputed: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyBookingsPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.bookings
      .mine()
      .then((res) => setRows(res.data as BookingRow[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Bookings</h1>
        <Link
          href={`/${locale}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Browse properties →
        </Link>
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No bookings yet.</p>
          <Link
            href={`/${locale}`}
            className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Find a hostel
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map(({ booking, propertyName, propertyCity, roomName }) => (
            <li key={booking.id}>
              <Link
                href={`/${locale}/bookings/${booking.id}`}
                className="block rounded-xl border border-zinc-200 bg-white px-4 py-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{propertyName}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {roomName} · {propertyCity}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOURS[booking.status] ?? STATUS_COLOURS.manual_pending}`}
                  >
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {fmt(booking.checkIn)} → {fmt(booking.checkOut)}
                  </span>
                  <span className="text-sm text-zinc-400">·</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    ₱{(booking.totalMinor / 100).toLocaleString('en-PH')}
                  </span>
                  <span className="ml-auto text-xs text-zinc-400">{booking.referenceCode}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
