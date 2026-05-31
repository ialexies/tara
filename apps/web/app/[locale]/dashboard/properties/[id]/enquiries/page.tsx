'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Enquiry = {
  id: string;
  guestName: string;
  guestEmail: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function EnquiriesPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.enquiry
      .list(propertyId)
      .then((res) => setEnquiries(res.data as Enquiry[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  async function handleMarkRead(enquiryId: string) {
    try {
      await api.enquiry.markRead(propertyId, enquiryId);
      setEnquiries((prev) => prev.map((e) => (e.id === enquiryId ? { ...e, isRead: true } : e)));
    } catch {
      // non-fatal
    }
  }

  const unreadCount = enquiries.filter((e) => !e.isRead).length;

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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Enquiries
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              {unreadCount} new
            </span>
          )}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && enquiries.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No enquiries yet. When guests ask a question from your property page, they'll appear here.
        </div>
      )}

      {!loading && (
        <ul className="space-y-3">
          {enquiries.map((e) => (
            <li
              key={e.id}
              className={`rounded-xl border bg-white p-4 dark:bg-zinc-900 ${
                e.isRead
                  ? 'border-zinc-200 dark:border-zinc-800'
                  : 'border-amber-200 dark:border-amber-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{e.guestName}</p>
                    {!e.isRead && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">{e.guestEmail}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(e.createdAt).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`mailto:${e.guestEmail}?subject=Re: Your enquiry`}
                    className="flex h-9 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Reply
                  </a>
                  {!e.isRead && (
                    <button
                      onClick={() => handleMarkRead(e.id)}
                      className="flex h-9 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {e.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
