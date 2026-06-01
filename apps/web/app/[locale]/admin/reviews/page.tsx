'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type ReviewRow = {
  id: string;
  propertyId: string;
  propertyName: string | null;
  guestName: string;
  rating: number;
  body: string | null;
  ownerReply: string | null;
  status: string;
  createdAt: string;
};

export default function AdminReviewsPage(): React.ReactElement {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.admin
      .listReviews()
      .then((r) => setReviews(r.data as ReviewRow[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reviews</h1>
      <p className="text-sm text-zinc-400">{reviews.length} reviews</p>
      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{r.guestName}</p>
                <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                >
                  {r.status}
                </span>
              </div>
              {r.propertyName && (
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{r.propertyName}</p>
              )}
              {r.body && <p className="mt-0.5 text-xs text-zinc-400">{r.body}</p>}
              {r.ownerReply && <p className="mt-0.5 text-xs text-blue-500">↳ {r.ownerReply}</p>}
              <p className="mt-0.5 text-[10px] text-zinc-400">
                {new Date(r.createdAt).toLocaleDateString('en-PH')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                disabled={acting === r.id}
                onClick={async () => {
                  const reply = prompt('Reply to this review:');
                  if (!reply) return;
                  setActing(r.id);
                  try {
                    await api.reviews.replyToReview(r.id, reply);
                    setReviews((prev) =>
                      prev.map((x) => (x.id === r.id ? { ...x, ownerReply: reply } : x)),
                    );
                  } catch {
                    alert('Failed');
                  } finally {
                    setActing(null);
                  }
                }}
                className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
              >
                Reply
              </button>
              <button
                disabled={acting === r.id}
                onClick={async () => {
                  if (!confirm('Delete this review?')) return;
                  setActing(r.id);
                  try {
                    await api.admin.deleteReview(r.id);
                    setReviews((prev) => prev.filter((x) => x.id !== r.id));
                  } catch {
                    alert('Failed');
                  } finally {
                    setActing(null);
                  }
                }}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
