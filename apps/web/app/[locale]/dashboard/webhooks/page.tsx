'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
};

const ALL_EVENTS = [
  'booking.created',
  'booking.confirmed',
  'booking.cancelled',
  'booking.checked_in',
  'booking.checked_out',
];

export default function WebhooksPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<Set<string>>(new Set(ALL_EVENTS.slice(0, 3)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  function load() {
    api.webhooks
      .list()
      .then((res) => setHooks(res.data as Webhook[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toggleEvent(e: string) {
    setEvents((prev) => {
      const next = new Set(prev);
      next.has(e) ? next.delete(e) : next.add(e);
      return next;
    });
  }

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.webhooks.create(url, Array.from(events));
      setShowForm(false);
      setUrl('');
      setEvents(new Set(ALL_EVENTS.slice(0, 3)));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Webhooks</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Receive real-time booking events at your endpoint.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Add webhook
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            New webhook
          </h2>
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Endpoint URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://your-server.com/webhook"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Events to receive:</p>
              {ALL_EVENTS.map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={events.has(e)}
                    onChange={() => toggleEvent(e)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{e}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || events.size === 0}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {submitting ? '…' : 'Create webhook'}
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

      {!loading && hooks.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No webhooks yet. Add one to receive booking events.
          </p>
        </div>
      )}

      {hooks.length > 0 && (
        <ul className="space-y-3">
          {hooks.map((hook) => (
            <li
              key={hook.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-zinc-900 dark:text-zinc-50">
                    {hook.url}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hook.events.map((e) => (
                      <span
                        key={e}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    {revealId === hook.id ? (
                      <p className="break-all font-mono text-xs text-zinc-500">{hook.secret}</p>
                    ) : (
                      <button
                        onClick={() => setRevealId(hook.id)}
                        className="text-xs text-zinc-400 hover:underline"
                      >
                        Reveal signing secret
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this webhook?')) return;
                    await api.webhooks.remove(hook.id);
                    load();
                  }}
                  className="flex h-8 shrink-0 items-center rounded-lg border border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
