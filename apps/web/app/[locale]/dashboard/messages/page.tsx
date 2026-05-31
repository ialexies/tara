'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { MessageThread } from '@/app/[locale]/bookings/[id]/message-thread';

type Thread = {
  booking_id: string;
  reference_code: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: string;
  property_id: string;
  property_name: string;
  last_message_body: string;
  last_message_at: string;
  last_sender_name: string;
  unread_count: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function MessagesPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  function load() {
    api.bookings
      .ownerMessagesInbox()
      .then((res) => setThreads(res.data as Thread[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function handleOpen(bookingId: string) {
    setOpenId(openId === bookingId ? null : bookingId);
    // Mark as read optimistically — the MessageThread component marks on fetch
    setThreads((prev) =>
      prev.map((t) => (t.booking_id === bookingId ? { ...t, unread_count: 0 } : t)),
    );
  }

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

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

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Messages</h1>
        {totalUnread > 0 && (
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
            {totalUnread}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && threads.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No messages yet.</p>
          <p className="text-xs text-zinc-400">
            When guests message about a booking, threads appear here.
          </p>
        </div>
      )}

      {!loading && threads.length > 0 && (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {threads.map((t) => {
            const isOpen = openId === t.booking_id;
            const hasUnread = t.unread_count > 0;

            return (
              <li key={t.booking_id}>
                {/* Thread row */}
                <button
                  onClick={() => handleOpen(t.booking_id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  {/* Unread dot */}
                  <div className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {hasUnread ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`text-sm ${hasUnread ? 'font-semibold text-zinc-900 dark:text-zinc-50' : 'font-medium text-zinc-700 dark:text-zinc-300'}`}
                        >
                          {t.guest_name}
                        </span>
                        <span className="ml-1.5 text-xs text-zinc-400">· {t.property_name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {hasUnread && (
                          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {t.unread_count}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {timeAgo(t.last_message_at)}
                        </span>
                      </div>
                    </div>

                    {/* Last message preview */}
                    <p
                      className={`mt-0.5 truncate text-sm ${hasUnread ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}`}
                    >
                      {t.last_sender_name ? `${t.last_sender_name.split(' ')[0]}: ` : ''}
                      {t.last_message_body}
                    </p>

                    {/* Booking info */}
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {t.reference_code} ·{' '}
                      {new Date(t.check_in + 'T00:00:00').toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' → '}
                      {new Date(t.check_out + 'T00:00:00').toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <span className="mt-1 shrink-0 text-xs text-zinc-400">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded message thread */}
                {isOpen && (
                  <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
                    <MessageThread bookingId={t.booking_id} guestName={t.guest_name} />
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
