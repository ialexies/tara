'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { isFirebaseConfigured } from '@/lib/firebase-client';

type Booking = {
  id: string;
  referenceCode: string;
  checkIn: string;
  checkOut: string;
  status: string;
  propertyName: string;
  roomName: string;
};

const STATUS_LABEL: Record<string, string> = {
  manual_pending: 'Pending',
  awaiting_verification: 'Pending',
  stripe_pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  checked_in: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  cancelled: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800',
};

export function RecentBookings({ locale }: { locale: string }): React.ReactElement | null {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    api.bookings
      .mine()
      .then((res) => {
        const all = res.data as Booking[];
        setBookings(all.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  if (bookings.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Your bookings</h2>
        <Link
          href={`/${locale}/bookings`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          View all →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={`/${locale}/bookings/${b.id}`}
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {b.propertyName}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[b.status] ?? 'bg-amber-100 text-amber-700'}`}
              >
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{b.roomName}</p>
            <p className="text-xs text-zinc-400">
              {b.checkIn} → {b.checkOut}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
