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
  paymentProofUrl: string | null;
  createdAt: string;
};

type Row = {
  booking: Booking;
  roomName: string;
  propertyName: string;
  propertyId: string;
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function AllBookingsPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'today' | 'upcoming' | 'all'>('pending');
  const [acting, setActing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const propsRes = await api.properties.list();
      const props = propsRes.data as { id: string; name: string }[];
      const bookingArrays = await Promise.all(
        props.map((p) =>
          api.bookings
            .listByProperty(p.id)
            .then((res) =>
              (res.data as { booking: Booking; roomName: string }[]).map((r) => ({
                ...r,
                propertyName: p.name,
                propertyId: p.id,
              })),
            )
            .catch(() => [] as Row[]),
        ),
      );
      const merged = bookingArrays
        .flat()
        .sort(
          (a, b) =>
            new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime(),
        );
      setRows(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: string) {
    setActing(id);
    try {
      await api.bookings.confirm(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleCheckIn(id: string) {
    if (!confirm('Mark guest as checked in?')) return;
    setActing(id);
    try {
      await api.bookings.checkIn(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleCheckOut(id: string) {
    if (!confirm('Mark guest as checked out?')) return;
    setActing(id);
    try {
      await api.bookings.checkOut(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const today = todayStr();
  const filtered = rows.filter((r) => {
    if (tab === 'pending')
      return ['manual_pending', 'awaiting_verification', 'stripe_pending'].includes(
        r.booking.status,
      );
    if (tab === 'today') return r.booking.checkIn === today;
    if (tab === 'upcoming') return r.booking.status === 'confirmed' && r.booking.checkIn > today;
    return true;
  });

  const tabCounts = {
    pending: rows.filter((r) =>
      ['manual_pending', 'awaiting_verification', 'stripe_pending'].includes(r.booking.status),
    ).length,
    today: rows.filter((r) => r.booking.checkIn === today).length,
    upcoming: rows.filter((r) => r.booking.status === 'confirmed' && r.booking.checkIn > today)
      .length,
    all: rows.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">All Bookings</h1>

      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(['pending', 'today', 'upcoming', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tabCounts[t] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab === t ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'}`}
              >
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No bookings in this category.
        </div>
      )}

      {!loading && (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const { booking, roomName, propertyName, propertyId } = r;
            const isExpanded = expandedId === booking.id;
            const isActing = acting === booking.id;
            const canConfirm = ['manual_pending', 'awaiting_verification'].includes(booking.status);
            const canCheckIn = booking.status === 'confirmed';
            const canCheckOut = booking.status === 'checked_in';

            return (
              <li
                key={booking.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                  className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400">{propertyName}</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {booking.guestName}
                    </p>
                    <p className="text-sm text-zinc-500">{booking.guestEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOURS[booking.status] ?? ''}`}
                    >
                      {STATUS_LABELS[booking.status] ?? booking.status}
                    </span>
                    <span className="text-xs text-zinc-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Booking details */}
                {isExpanded && (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-zinc-500">Room</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{roomName}</span>
                      <span className="text-zinc-500">Dates</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} (
                        {booking.nights}n)
                      </span>
                      <span className="text-zinc-500">Ref</span>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">
                        {booking.referenceCode}
                      </span>
                      <span className="text-zinc-500">Total</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        ₱{(booking.totalMinor / 100).toLocaleString('en-PH')}
                      </span>
                    </div>

                    {booking.specialRequests && (
                      <p className="mt-2 text-xs italic text-zinc-500">
                        "{booking.specialRequests}"
                      </p>
                    )}

                    {canConfirm && booking.paymentProofUrl && (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-medium text-zinc-500">Payment screenshot</p>
                        <a href={booking.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={booking.paymentProofUrl}
                            alt="Payment proof"
                            className="max-h-40 w-full rounded-lg border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </a>
                      </div>
                    )}

                    <div className="mt-3">
                      <MessageThread bookingId={booking.id} guestName={booking.guestName} />
                    </div>

                    <div className="mt-2 text-right">
                      <Link
                        href={`/${locale}/dashboard/properties/${propertyId}/bookings`}
                        className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        View in property →
                      </Link>
                    </div>
                  </>
                )}

                {/* Actions */}
                {(canConfirm || canCheckIn || canCheckOut) && (
                  <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    {canConfirm && (
                      <button
                        onClick={() => handleConfirm(booking.id)}
                        disabled={isActing}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isActing ? '…' : 'Confirm payment'}
                      </button>
                    )}
                    {canCheckIn && (
                      <button
                        onClick={() => handleCheckIn(booking.id)}
                        disabled={isActing}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isActing ? '…' : 'Check in'}
                      </button>
                    )}
                    {canCheckOut && (
                      <button
                        onClick={() => handleCheckOut(booking.id)}
                        disabled={isActing}
                        className="flex h-9 flex-1 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        {isActing ? '…' : 'Check out'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
