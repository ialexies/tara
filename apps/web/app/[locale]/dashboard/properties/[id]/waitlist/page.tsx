'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type RoomCount = {
  roomId: string;
  roomName: string;
  count: number;
};

export default function WaitlistPage() {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();
  const [counts, setCounts] = useState<RoomCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.waitlist
      .countsByRoom(propertyId)
      .then((res) => setCounts(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const total = counts.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Waitlist</h1>
          {!loading && total > 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              {total} guest{total !== 1 ? 's' : ''} waiting across {counts.length} room
              {counts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          href={`/${locale}/dashboard/properties/${propertyId}/rooms`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Rooms
        </Link>
      </div>

      {loading && <p className="py-8 text-center text-sm text-zinc-400">Loading…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && counts.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No guests on the waitlist right now.</p>
          <p className="text-xs text-zinc-400">
            Guests are automatically notified when a booking is cancelled.
          </p>
        </div>
      )}

      {!loading && counts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                  Room
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                  Waiting
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {counts.map((row) => (
                <tr key={row.roomId}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {row.roomName}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      {row.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
