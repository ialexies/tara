'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Owner = {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  property_count: number;
  active_property_count: number;
  booking_count: number;
  total_revenue_minor: number;
};

type OwnerProperty = {
  id: string;
  name: string;
  slug: string;
  status: string;
  city: string;
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-600',
  archived: 'bg-zinc-100 text-zinc-400',
};

export default function AdminOwnersPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'no_active'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ownerProps, setOwnerProps] = useState<Record<string, OwnerProperty[]>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.admin
      .listOwners()
      .then((r) => setOwners(r.data as Owner[]))
      .finally(() => setLoading(false));
  }, []);

  function reload() {
    api.admin.listOwners().then((r) => setOwners(r.data as Owner[]));
  }

  async function handleExpand(ownerId: string) {
    if (expanded === ownerId) {
      setExpanded(null);
      return;
    }
    setExpanded(ownerId);
    if (!ownerProps[ownerId]) {
      try {
        const r = await api.properties.adminListByOwner(ownerId);
        setOwnerProps((prev) => ({ ...prev, [ownerId]: r.data as OwnerProperty[] }));
      } catch {
        setOwnerProps((prev) => ({ ...prev, [ownerId]: [] }));
      }
    }
  }

  async function handleApproveProperty(ownerId: string, propertyId: string) {
    await api.properties.adminSetStatus(propertyId, 'active');
    setOwnerProps((prev) => ({
      ...prev,
      [ownerId]:
        prev[ownerId]?.map((p) => (p.id === propertyId ? { ...p, status: 'active' } : p)) ?? [],
    }));
    reload();
  }

  async function handleSuspendProperty(ownerId: string, propertyId: string) {
    if (!confirm('Suspend this property?')) return;
    await api.properties.adminSetStatus(propertyId, 'suspended');
    setOwnerProps((prev) => ({
      ...prev,
      [ownerId]:
        prev[ownerId]?.map((p) => (p.id === propertyId ? { ...p, status: 'suspended' } : p)) ?? [],
    }));
    reload();
  }

  async function handleSuspendAll(owner: Owner) {
    const name = owner.full_name ?? owner.email;
    if (!confirm(`Suspend all properties for ${name}?`)) return;
    setActing(owner.id);
    try {
      const { suspended } = await api.properties.adminSuspendAllByOwner(owner.id);
      alert(`${suspended} propert${suspended === 1 ? 'y' : 'ies'} suspended.`);
      setOwnerProps((prev) => ({
        ...prev,
        [owner.id]: prev[owner.id]?.map((p) => ({ ...p, status: 'suspended' })) ?? [],
      }));
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleChangeRole(owner: Owner) {
    const current = 'owner';
    const newRole = current === 'owner' ? 'guest' : 'owner';
    if (!confirm(`Change ${owner.email} role to "${newRole}"?`)) return;
    setActing(owner.id);
    try {
      await api.admin.setUserRole(owner.id, newRole);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleBroadcast() {
    setSending(true);
    try {
      const { sent } = await api.admin.broadcast({ subject, message });
      alert(`Sent to ${sent} owner(s).`);
      setBroadcastOpen(false);
      setSubject('');
      setMessage('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  const filtered = owners.filter((o) =>
    filter === 'no_active' ? o.active_property_count === 0 : true,
  );
  const needsSetup = owners.filter((o) => o.active_property_count === 0).length;

  const inputClass =
    'w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Owners
          <span className="ml-2 text-sm font-normal text-zinc-400">({owners.length})</span>
        </h1>
        <button
          onClick={() => setBroadcastOpen(true)}
          className="flex h-9 items-center rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Broadcast to owners
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(
          [
            ['all', `All (${owners.length})`],
            ['no_active', `Needs setup (${needsSetup})`],
          ] as const
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                : 'border border-zinc-200 text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading owners…</div>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No owners found.
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((owner) => {
          const name =
            (owner.full_name ?? `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim()) ||
            owner.email;
          const hasActive = owner.active_property_count > 0;
          const isExpanded = expanded === owner.id;
          const isActing = acting === owner.id;

          return (
            <li
              key={owner.id}
              className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Summary row */}
              <button
                onClick={() => handleExpand(owner.id)}
                className="flex w-full flex-wrap items-start gap-3 p-4 text-left"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${hasActive ? 'bg-emerald-500' : 'bg-amber-400'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
                  <p className="text-xs text-zinc-500">{owner.email}</p>
                  {owner.phone && <p className="text-xs text-zinc-400">{owner.phone}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${hasActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                  >
                    {owner.active_property_count}/{owner.property_count} active
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {owner.booking_count} bookings
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    ₱{(owner.total_revenue_minor / 100).toLocaleString('en-PH')}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(owner.created_at).toLocaleDateString('en-PH', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-zinc-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Action row */}
              <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 pb-3 pt-2 dark:border-zinc-800">
                <a
                  href={`mailto:${owner.email}`}
                  className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Email
                </a>
                <button
                  disabled={isActing}
                  onClick={() => handleChangeRole(owner)}
                  className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Change role
                </button>
                <button
                  disabled={isActing}
                  onClick={() => handleSuspendAll(owner)}
                  className="flex h-8 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
                >
                  {isActing ? '…' : 'Suspend all'}
                </button>
              </div>

              {/* Accordion — properties */}
              {isExpanded && (
                <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
                  {!ownerProps[owner.id] ? (
                    <p className="py-3 text-center text-sm text-zinc-400">Loading…</p>
                  ) : ownerProps[owner.id]!.length === 0 ? (
                    <p className="py-3 text-sm text-zinc-400">No properties yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {ownerProps[owner.id]!.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/${locale}/properties/${p.slug}`}
                              target="_blank"
                              className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                            >
                              {p.name} ↗
                            </Link>
                            <p className="text-xs text-zinc-500">{p.city}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOURS[p.status] ?? ''}`}
                            >
                              {p.status}
                            </span>
                            {p.status !== 'active' && p.status !== 'suspended' && (
                              <button
                                onClick={() => handleApproveProperty(owner.id, p.id)}
                                className="flex h-7 items-center rounded-lg bg-emerald-600 px-2 text-[10px] font-semibold text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            )}
                            {p.status !== 'suspended' && (
                              <button
                                onClick={() => handleSuspendProperty(owner.id, p.id)}
                                className="flex h-7 items-center rounded-lg border border-red-200 px-2 text-[10px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800"
                              >
                                Suspend
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Broadcast modal */}
      {broadcastOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setBroadcastOpen(false)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Broadcast to all owners
              </h2>
              <button
                onClick={() => setBroadcastOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${inputClass} h-11`}
            />
            <textarea
              placeholder="Message to owners…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className={`${inputClass} resize-none py-3`}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBroadcastOpen(false)}
                className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                disabled={sending || !subject.trim() || !message.trim()}
                onClick={handleBroadcast}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {sending ? 'Sending…' : `Send to ${owners.length} owners`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
