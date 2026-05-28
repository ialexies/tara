'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type BlacklistEntry = {
  id: string;
  guestEmail: string;
  reason: string | null;
  createdAt: string;
};

export default function BlacklistPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.blacklist
      .list(propertyId)
      .then((res) => setEntries(res.data as BlacklistEntry[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [propertyId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.blacklist.add(propertyId, email, reason || undefined);
      setShowForm(false);
      setEmail('');
      setReason('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove from blacklist?')) return;
    await api.blacklist.remove(propertyId, id);
    load();
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/dashboard/properties/${propertyId}/rooms`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Property
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Guest blacklist
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">Block guests from booking your property.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Block guest
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Block a guest
          </h2>
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Guest email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="guest@example.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">
                Reason (optional, private)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Property damage"
                maxLength={500}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? '…' : 'Block guest'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm text-zinc-500 dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && entries.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No blocked guests. Block guests to prevent future bookings.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {entry.guestEmail}
                </p>
                {entry.reason && <p className="text-xs text-zinc-500">{entry.reason}</p>}
                <p className="text-xs text-zinc-400">
                  {new Date(entry.createdAt).toLocaleDateString('en-PH')}
                </p>
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
