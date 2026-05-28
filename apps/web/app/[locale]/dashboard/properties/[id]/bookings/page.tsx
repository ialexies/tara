'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { MessageThread } from '@/app/[locale]/bookings/[id]/message-thread';

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
  stripe_pending: 'Awaiting card payment',
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
  stripe_pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
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

  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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

  async function handleCheckIn(id: string) {
    if (!confirm('Mark this guest as checked in?')) return;
    setActing(id);
    try {
      await api.bookings.checkIn(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleCheckOut(id: string) {
    if (!confirm('Mark this guest as checked out?')) return;
    setActing(id);
    try {
      await api.bookings.checkOut(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const pending = rows.filter((r) =>
    ['stripe_pending', 'manual_pending', 'awaiting_verification'].includes(r.booking.status),
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

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bookings</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = [
                'Ref',
                'Guest',
                'Email',
                'Room',
                'Check-in',
                'Check-out',
                'Nights',
                'Total (PHP)',
                'Status',
                'Created',
              ];
              const csvRows = rows.map(({ booking, roomName }) => [
                booking.referenceCode,
                booking.guestName,
                booking.guestEmail,
                roomName,
                booking.checkIn,
                booking.checkOut,
                booking.nights,
                (booking.totalMinor / 100).toFixed(2),
                booking.status,
                new Date(booking.createdAt).toLocaleDateString('en-PH'),
              ]);
              const csv = [headers, ...csvRows]
                .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
                .join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            ↓ CSV
          </button>
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {(['list', 'calendar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {/* List view */}
      {tab === 'list' && (
        <>
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
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onRefresh={load}
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
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onRefresh={load}
                />
              ))}
            </section>
          )}
        </>
      )}

      {/* Calendar view */}
      {tab === 'calendar' && !loading && (
        <BookingCalendar rows={rows} month={calMonth} onMonthChange={setCalMonth} />
      )}
    </div>
  );
}

function BookingCalendar({
  rows,
  month,
  onMonthChange,
}: {
  rows: BookingRow[];
  month: string;
  onMonthChange: (m: string) => void;
}): React.ReactElement {
  const [year, mon] = month.split('-').map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const STATUS_DOT: Record<string, string> = {
    confirmed: 'bg-emerald-500',
    checked_in: 'bg-green-600',
    stripe_pending: 'bg-blue-400',
    manual_pending: 'bg-amber-400',
    cancelled: 'bg-red-400',
  };

  // Map each date in this month to bookings that overlap it
  const dateMap = new Map<string, BookingRow[]>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hits = rows.filter((r) => {
      return r.booking.checkIn <= dateStr && r.booking.checkOut > dateStr;
    });
    if (hits.length) dateMap.set(dateStr, hits);
  }

  function prevMonth() {
    const d = new Date(year, mon - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(year, mon, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          ‹
        </button>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {firstDay.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1.5 text-xs font-medium text-zinc-400">
            {d}
          </div>
        ))}
        {/* Empty cells before first day */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hits = dateMap.get(dateStr) ?? [];
          const isToday = dateStr === today;
          return (
            <div
              key={d}
              className={`flex min-h-[52px] flex-col items-center gap-1 rounded-lg p-1 ${
                isToday ? 'bg-zinc-100 dark:bg-zinc-800' : ''
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isToday ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {d}
              </span>
              {hits.slice(0, 3).map((r) => (
                <span
                  key={r.booking.id}
                  title={`${r.booking.guestName} · ${r.roomName}`}
                  className={`h-1.5 w-full max-w-[28px] rounded-full ${STATUS_DOT[r.booking.status] ?? 'bg-zinc-300'}`}
                />
              ))}
              {hits.length > 3 && (
                <span className="text-[10px] text-zinc-400">+{hits.length - 3}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {Object.entries(STATUS_DOT).map(([status, colour]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${colour}`} />
            {status.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

type ModificationRequest = {
  id: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  status: string;
  guestMessage: string | null;
};

function ModificationRequests({
  bookingId,
  onResolved,
}: {
  bookingId: string;
  onResolved: () => void;
}): React.ReactElement {
  const [requests, setRequests] = useState<ModificationRequest[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    api.bookings
      .listModificationRequests(bookingId)
      .then((res) => setRequests(res.data as ModificationRequest[]))
      .catch(() => undefined);
  }, [bookingId]);

  const pending = requests.filter((r) => r.status === 'pending');
  if (pending.length === 0) return <></>;

  async function resolve(requestId: string, action: 'approved' | 'rejected') {
    setResolving(requestId);
    try {
      await api.bookings.resolveModificationRequest(bookingId, requestId, action);
      onResolved();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
      setResolving(null);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-amber-100 pt-3 dark:border-amber-900">
      {pending.map((req) => (
        <div key={req.id} className="rounded-lg bg-amber-50 px-3 py-2.5 dark:bg-amber-950">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            Date change request
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            {formatDate(req.requestedCheckIn)} → {formatDate(req.requestedCheckOut)}
          </p>
          {req.guestMessage && (
            <p className="mt-0.5 text-xs italic text-amber-600 dark:text-amber-400">
              "{req.guestMessage}"
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => resolve(req.id, 'approved')}
              disabled={resolving === req.id}
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {resolving === req.id ? '…' : 'Approve'}
            </button>
            <button
              onClick={() => resolve(req.id, 'rejected')}
              disabled={resolving === req.id}
              className="flex h-8 flex-1 items-center justify-center rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  roomName,
  acting,
  onConfirm,
  onCancel,
  onCheckIn,
  onCheckOut,
  onRefresh,
}: {
  booking: Booking;
  roomName: string;
  acting: string | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onRefresh: () => void;
}): React.ReactElement {
  const canConfirm = ['manual_pending', 'awaiting_verification'].includes(booking.status);
  const canCancel = ['manual_pending', 'awaiting_verification', 'confirmed'].includes(
    booking.status,
  );
  const canCheckIn = booking.status === 'confirmed';
  const canCheckOut = booking.status === 'checked_in';
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

      {booking.status === 'confirmed' && (
        <ModificationRequests bookingId={booking.id} onResolved={onRefresh} />
      )}

      <div className="mt-3">
        <MessageThread bookingId={booking.id} guestName={booking.guestName} />
      </div>

      {(canConfirm || canCancel || canCheckIn || canCheckOut) && (
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
          {canCheckIn && (
            <button
              onClick={() => onCheckIn(booking.id)}
              disabled={isActing}
              className="flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isActing ? '…' : 'Check in'}
            </button>
          )}
          {canCheckOut && (
            <button
              onClick={() => onCheckOut(booking.id)}
              disabled={isActing}
              className="flex h-9 flex-1 items-center justify-center rounded-lg bg-zinc-700 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-600"
            >
              {isActing ? '…' : 'Check out'}
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
