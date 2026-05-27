'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Booking = {
  id: string;
  referenceCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
  status: string;
  specialRequests: string | null;
  createdAt: string;
};

type BookingRow = {
  booking: Booking;
  roomName: string;
};

const STATUS_LABELS: Record<string, string> = {
  manual_pending: 'Awaiting payment',
  awaiting_verification: 'Verifying',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

const STATUS_COLOURS: Record<string, string> = {
  manual_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  awaiting_verification: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  checked_in: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  checked_out: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  refunded: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  disputed: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BookingsInboxPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [propertyId]);

  function load() {
    setLoading(true);
    api.bookings
      .listByProperty(propertyId)
      .then((res) => setRows(res.data as BookingRow[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleConfirm(id: string) {
    setActing(id);
    try {
      await api.bookings.confirm(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setActing(id);
    try {
      await api.bookings.cancel(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const pending = rows.filter((r) =>
    ['manual_pending', 'awaiting_verification'].includes(r.booking.status),
  );
  const others = rows.filter(
    (r) => !['manual_pending', 'awaiting_verification'].includes(r.booking.status),
  );

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

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bookings</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No bookings yet.</p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Needs attention ({pending.length})
          </h2>
          {pending.map(({ booking, roomName }) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              roomName={roomName}
              acting={acting}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}
        </section>
      )}

      {!loading && others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            All bookings
          </h2>
          {others.map(({ booking, roomName }) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              roomName={roomName}
              acting={acting}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  roomName,
  acting,
  onConfirm,
  onCancel,
}: {
  booking: Booking;
  roomName: string;
  acting: string | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}): React.ReactElement {
  const canConfirm = ['manual_pending', 'awaiting_verification'].includes(booking.status);
  const canCancel = ['manual_pending', 'awaiting_verification', 'confirmed'].includes(
    booking.status,
  );
  const isActing = acting === booking.id;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{booking.guestName}</p>
          <p className="text-sm text-zinc-500">{booking.guestEmail}</p>
          {booking.guestPhone && <p className="text-sm text-zinc-500">{booking.guestPhone}</p>}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOURS[booking.status] ?? ''}`}
        >
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-zinc-500">Room</span>
        <span className="text-zinc-700 dark:text-zinc-300">{roomName}</span>
        <span className="text-zinc-500">Dates</span>
        <span className="text-zinc-700 dark:text-zinc-300">
          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ({booking.nights}n)
        </span>
        <span className="text-zinc-500">Ref</span>
        <span className="font-mono text-zinc-700 dark:text-zinc-300">{booking.referenceCode}</span>
        <span className="text-zinc-500">Total</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          ₱{(booking.totalMinor / 100).toLocaleString('en-PH')}
        </span>
      </div>

      {booking.specialRequests && (
        <p className="mt-2 text-xs italic text-zinc-500">"{booking.specialRequests}"</p>
      )}

      {(canConfirm || canCancel) && (
        <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {canConfirm && (
            <button
              onClick={() => onConfirm(booking.id)}
              disabled={isActing}
              className="flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isActing ? '…' : 'Confirm payment'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={isActing}
              className="flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm text-zinc-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
