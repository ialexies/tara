'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type PropertyRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  region: string;
  propertyType: string;
  status: string;
  tenantId: string;
  createdAt: string;
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  paused: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  archived: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
};

export default function AdminPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.properties
      .adminListAll()
      .then((res) => setProperties(res.data as PropertyRow[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSetStatus(id: string, status: string) {
    setActing(id);
    try {
      await api.properties.adminSetStatus(id, status);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const pending = properties.filter((p) => p.status === 'pending');
  const others = properties.filter((p) => p.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin — Properties</h1>
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← My dashboard
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error} — you may not have admin access.
        </div>
      )}

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Pending review ({pending.length})
          </h2>
          {pending.map((p) => (
            <PropertyAdminCard
              key={p.id}
              property={p}
              locale={locale}
              acting={acting}
              onSetStatus={handleSetStatus}
            />
          ))}
        </section>
      )}

      {!loading && others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            All properties ({others.length})
          </h2>
          {others.map((p) => (
            <PropertyAdminCard
              key={p.id}
              property={p}
              locale={locale}
              acting={acting}
              onSetStatus={handleSetStatus}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PropertyAdminCard({
  property,
  locale,
  acting,
  onSetStatus,
}: {
  property: PropertyRow;
  locale: string;
  acting: string | null;
  onSetStatus: (id: string, status: string) => void;
}): React.ReactElement {
  const isActing = acting === property.id;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/${locale}/properties/${property.slug}`}
            target="_blank"
            className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
          >
            {property.name} ↗
          </Link>
          <p className="mt-0.5 text-sm text-zinc-500">
            {property.city}, {property.region} · {property.propertyType}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">Tenant: {property.tenantId}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOURS[property.status] ?? ''}`}
        >
          {property.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {property.status !== 'active' && (
          <button
            onClick={() => onSetStatus(property.id, 'active')}
            disabled={isActing}
            className="flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {property.status !== 'suspended' && (
          <button
            onClick={() => {
              if (!confirm(`Suspend "${property.name}"?`)) return;
              onSetStatus(property.id, 'suspended');
            }}
            disabled={isActing}
            className="flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Suspend
          </button>
        )}
        {property.status !== 'paused' && property.status !== 'draft' && (
          <button
            onClick={() => onSetStatus(property.id, 'paused')}
            disabled={isActing}
            className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
          >
            Pause
          </button>
        )}
      </div>
    </div>
  );
}
