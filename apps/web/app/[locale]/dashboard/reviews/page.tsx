'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Review = {
  id: string;
  propertyId: string;
  propertyName: string;
  bookingId: string;
  guestName: string;
  rating: number;
  body: string | null;
  status: string;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400">
      {'★'.repeat(rating)}
      <span className="text-zinc-300 dark:text-zinc-600">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const { locale } = useParams<{ locale: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    api.reviews
      .listMine()
      .then((res) => setReviews(res.data as Review[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function submitReply(reviewId: string) {
    const reply = replyDraft[reviewId]?.trim();
    if (!reply) return;
    setSubmitting(reviewId);
    try {
      await api.reviews.replyToReview(reviewId, reply);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, ownerReply: reply, ownerRepliedAt: new Date().toISOString() }
            : r,
        ),
      );
      setReplyDraft((d) => ({ ...d, [reviewId]: '' }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit reply');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Guest Reviews</h1>
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Dashboard
        </Link>
      </div>

      {loading && <p className="py-8 text-center text-sm text-zinc-400">Loading…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-400">No reviews yet.</p>
      )}

      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                {review.guestName}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">{review.propertyName}</p>
            </div>
            <div className="shrink-0 text-right">
              <Stars rating={review.rating} />
              <p className="mt-0.5 text-xs text-zinc-400">
                {new Date(review.createdAt).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {review.body && (
            <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">{review.body}</p>
          )}

          {review.ownerReply ? (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="mb-1 text-xs font-semibold text-zinc-500">Your reply</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.ownerReply}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={3}
                placeholder="Write a reply to this review…"
                value={replyDraft[review.id] ?? ''}
                onChange={(e) => setReplyDraft((d) => ({ ...d, [review.id]: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                onClick={() => submitReply(review.id)}
                disabled={!replyDraft[review.id]?.trim() || submitting === review.id}
                className="flex h-9 min-w-[80px] items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {submitting === review.id ? 'Posting…' : 'Reply'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
