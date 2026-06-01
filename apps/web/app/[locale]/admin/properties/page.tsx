'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Property = {
  id: string;
  name: string;
  slug: string;
  city: string;
  region: string;
  propertyType: string;
  status: string;
  tenantId: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  paused: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  archived: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
};

export default function AdminPropertiesPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.properties
      .adminListAll()
      .then((r) => setProperties(r.data as Property[]))
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
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      (p.ownerEmail ?? '').toLowerCase().includes(q);
    const matchS = !statusFilter || p.status === statusFilter;
    return matchQ && matchS;
  });

  const pending = filtered.filter((p) => p.status === 'pending');
  const others = filtered.filter((p) => p.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Properties</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, owner…"
          className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">All statuses</option>
          {['draft', 'pending', 'active', 'paused', 'suspended', 'archived'].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Pending review ({pending.length})
              </h2>
              {pending.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  locale={locale}
                  acting={acting}
                  onSetStatus={handleSetStatus}
                />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                All ({others.length})
              </h2>
              {others.map((p) => (
                <PropertyCard
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
      )}
    </div>
  );
}

function PropertyCard({
  property: p,
  locale,
  acting,
  onSetStatus,
}: {
  property: Property;
  locale: string;
  acting: string | null;
  onSetStatus: (id: string, status: string) => void;
}): React.ReactElement {
  const isActing = acting === p.id;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/${locale}/properties/${p.slug}`}
            target="_blank"
            className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
          >
            {p.name} ↗
          </Link>
          <p className="mt-0.5 text-sm text-zinc-500">
            {p.city}, {p.region} · {p.propertyType}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Owner: {p.ownerName ?? p.ownerEmail ?? '—'}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOURS[p.status] ?? ''}`}
        >
          {p.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {p.status !== 'active' && (
          <button
            disabled={isActing}
            onClick={() => onSetStatus(p.id, 'active')}
            className="flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {p.status !== 'suspended' && (
          <button
            disabled={isActing}
            onClick={() => {
              if (confirm(`Suspend "${p.name}"?`)) onSetStatus(p.id, 'suspended');
            }}
            className="flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800"
          >
            Suspend
          </button>
        )}
        {p.status !== 'paused' && p.status !== 'draft' && (
          <button
            disabled={isActing}
            onClick={() => onSetStatus(p.id, 'paused')}
            className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700"
          >
            Pause
          </button>
        )}
      </div>
    </div>
  );
}
