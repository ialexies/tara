'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function CancelBookingButton({
  bookingId,
  guestEmail,
  checkIn,
  freeCancelDays = 3,
  partialRefundPercent = 50,
}: {
  bookingId: string;
  guestEmail: string;
  checkIn?: string;
  freeCancelDays?: number;
  partialRefundPercent?: number;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/cancel-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestEmail: emailInput }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'Could not cancel booking');
      }
      setCancelled(true);
      setOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (cancelled) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        Your booking has been cancelled. A confirmation email will be sent to {guestEmail}.
      </div>
    );
  }

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Cancel booking
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="mb-3 text-sm font-medium text-red-800 dark:text-red-200">
            Confirm cancellation
          </p>
          <p className="mb-3 text-sm text-red-700 dark:text-red-300">
            {checkIn
              ? (() => {
                  const days = Math.ceil((new Date(checkIn).getTime() - Date.now()) / 86400000);
                  if (days >= freeCancelDays)
                    return `You're within the free cancellation window — full refund.`;
                  if (partialRefundPercent > 0)
                    return `Free cancellation period has passed. You will receive a ${partialRefundPercent}% refund.`;
                  return `Free cancellation period has passed. This booking is non-refundable.`;
                })()
              : 'Enter your email address to confirm.'}
          </p>
          <p className="mb-4 text-xs text-red-600 dark:text-red-400">This cannot be undone.</p>
          {error && (
            <p className="mb-3 rounded-lg bg-white px-3 py-2 text-sm text-red-600 dark:bg-red-900">
              {error}
            </p>
          )}
          <form onSubmit={handleCancel} className="space-y-3">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={guestEmail}
              required
              className="w-full rounded-lg border border-red-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none dark:border-red-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Cancelling…' : 'Yes, cancel booking'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEmailInput('');
                  setError(null);
                }}
                className="flex h-10 items-center justify-center rounded-lg border border-red-300 px-4 text-sm text-red-700 dark:border-red-700 dark:text-red-300"
              >
                Keep it
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
