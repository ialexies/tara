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

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
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

const ROLE_COLOURS: Record<string, string> = {
  guest: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  owner: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

export default function AdminPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [tab, setTab] = useState<'properties' | 'users' | 'reviews' | 'audit' | 'bookings'>(
    'properties',
  );

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [propsError, setPropsError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [propSearch, setPropSearch] = useState('');
  const [propStatusFilter, setPropStatusFilter] = useState('');

  type ReviewRow = {
    id: string;
    propertyId: string;
    guestName: string;
    rating: number;
    body: string | null;
    ownerReply: string | null;
    status: string;
    createdAt: string;
  };
  const [reviewList, setReviewList] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  type AuditRow = {
    id: string;
    event: string;
    actorEmail: string | null;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  };
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  type PlatformStats = {
    activeProperties: number;
    totalUsers: number;
    bookingsThisMonth: number;
    revenueThisMonthMinor: number;
  };
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  function loadProperties() {
    setPropsLoading(true);
    api.properties
      .adminListAll()
      .then((res) => setProperties(res.data as PropertyRow[]))
      .catch((e: Error) => setPropsError(e.message))
      .finally(() => setPropsLoading(false));
  }

  function loadUsers() {
    setUsersLoading(true);
    api.admin
      .listUsers()
      .then((res) => setUsers(res.data as UserRow[]))
      .catch((e: Error) => setUsersError(e.message))
      .finally(() => setUsersLoading(false));
  }

  useEffect(() => {
    loadProperties();
    api.admin
      .stats()
      .then(setPlatformStats)
      .catch(() => {});
  }, []);

  function loadReviews() {
    setReviewsLoading(true);
    api.admin
      .listReviews()
      .then((res) => setReviewList(res.data as ReviewRow[]))
      .catch((e: Error) => setReviewsError(e.message))
      .finally(() => setReviewsLoading(false));
  }

  useEffect(() => {
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'reviews' && reviewList.length === 0) loadReviews();
    if (tab === 'audit' && auditRows.length === 0) {
      setAuditLoading(true);
      api.admin
        .listAuditLog(200)
        .then((res) => setAuditRows(res.data as AuditRow[]))
        .catch(() => {})
        .finally(() => setAuditLoading(false));
    }
  }, [tab]);

  async function handleSetStatus(id: string, status: string) {
    setActing(id);
    try {
      await api.properties.adminSetStatus(id, status);
      loadProperties();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleSetRole(id: string, role: string) {
    setActing(id);
    try {
      await api.admin.setUserRole(id, role);
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const filterProps = (arr: PropertyRow[]) =>
    arr.filter((p) => {
      const q = propSearch.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q);
      const matchesStatus = !propStatusFilter || p.status === propStatusFilter;
      return matchesSearch && matchesStatus;
    });

  const pending = filterProps(properties.filter((p) => p.status === 'pending'));
  const others = filterProps(properties.filter((p) => p.status !== 'pending'));

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.fullName ?? '').toLowerCase().includes(userSearch.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin</h1>
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← My dashboard
        </Link>
      </div>

      {/* Platform stats */}
      {platformStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Active properties', value: platformStats.activeProperties },
            { label: 'Total users', value: platformStats.totalUsers },
            { label: 'Bookings this month', value: platformStats.bookingsThisMonth },
            {
              label: 'Revenue this month',
              value: `₱${(platformStats.revenueThisMonthMinor / 100).toLocaleString('en-PH')}`,
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {(['properties', 'users', 'reviews', 'audit', 'bookings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Properties tab */}
      {tab === 'properties' && (
        <>
          <div className="flex gap-2">
            <input
              type="search"
              value={propSearch}
              onChange={(e) => setPropSearch(e.target.value)}
              placeholder="Search by name, city, region…"
              className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <select
              value={propStatusFilter}
              onChange={(e) => setPropStatusFilter(e.target.value)}
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
          {propsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {propsError} — you may not have admin access.
            </div>
          )}
          {propsLoading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}
          {!propsLoading && pending.length > 0 && (
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
          {!propsLoading && others.length > 0 && (
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
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <>
          {usersError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {usersError}
            </div>
          )}
          {usersLoading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}
          {!usersLoading && (
            <>
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or name…"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <p className="text-sm text-zinc-500">{filteredUsers.length} users</p>
              <ul className="space-y-2">
                {filteredUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {u.fullName ?? u.email}
                      </p>
                      {u.fullName && <p className="truncate text-xs text-zinc-500">{u.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLOURS[u.role] ?? ''}`}
                      >
                        {u.role}
                      </span>
                      <select
                        value={u.role}
                        disabled={acting === u.id}
                        onChange={(e) => handleSetRole(u.id, e.target.value)}
                        className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        <option value="guest">guest</option>
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <>
          {reviewsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {reviewsError}
            </div>
          )}
          {reviewsLoading && (
            <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>
          )}
          {!reviewsLoading && (
            <>
              <p className="text-sm text-zinc-500">{reviewList.length} reviews</p>
              <ul className="space-y-3">
                {reviewList.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {r.guestName}
                        </p>
                        <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                        >
                          {r.status}
                        </span>
                      </div>
                      {r.body && <p className="mt-0.5 truncate text-xs text-zinc-500">{r.body}</p>}
                      {r.ownerReply && (
                        <p className="mt-0.5 truncate text-xs text-blue-500">↳ {r.ownerReply}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {r.propertyId.slice(0, 8)}… ·{' '}
                        {new Date(r.createdAt).toLocaleDateString('en-PH')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={async () => {
                          const reply = prompt('Reply to this review:');
                          if (!reply) return;
                          try {
                            await api.reviews.replyToReview(r.id, reply);
                            setReviewList((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, ownerReply: reply } : x)),
                            );
                          } catch {
                            alert('Failed to reply');
                          }
                        }}
                        className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                      >
                        Reply
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Delete this review?')) return;
                          try {
                            await api.admin.deleteReview(r.id);
                            setReviewList((prev) => prev.filter((x) => x.id !== r.id));
                          } catch {
                            alert('Failed to delete');
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
            </>
          )}
        </>
      )}
      {/* Audit tab */}
      {tab === 'audit' && (
        <>
          {auditLoading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}
          {!auditLoading && (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2">Event</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {auditRows.map((r) => (
                    <tr key={r.id} className="bg-white dark:bg-zinc-900">
                      <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                        {r.event}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{r.actorEmail ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-400">
                        {r.entityType && r.entityId
                          ? `${r.entityType}:${r.entityId.slice(0, 8)}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {new Date(r.createdAt).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && <AdminBookingsTab />}
    </div>
  );
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  stripe_pending: 'Awaiting card',
  manual_pending: 'Awaiting payment',
  awaiting_verification: 'Verifying',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

const BOOKING_STATUS_COLOURS: Record<string, string> = {
  stripe_pending: 'bg-blue-100 text-blue-700',
  manual_pending: 'bg-amber-100 text-amber-700',
  awaiting_verification: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-zinc-100 text-zinc-600',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-zinc-100 text-zinc-500',
  disputed: 'bg-orange-100 text-orange-700',
};

function AdminBookingsTab(): React.ReactElement {
  type AdminBooking = {
    id: string;
    referenceCode: string;
    guestEmail: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    totalMinor: number;
    status: string;
    paymentMode: string;
    createdAt: string;
    propertyName: string;
  };

  const [bookingList, setBookingList] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  async function load(newOffset = 0, status = statusFilter) {
    setBookingsLoading(true);
    try {
      const res = await api.admin.listAllBookings({
        status: status || undefined,
        limit: LIMIT,
        offset: newOffset,
      });
      const data = res.data as AdminBooking[];
      if (newOffset === 0) {
        setBookingList(data);
      } else {
        setBookingList((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      setOffset(newOffset + data.length);
    } catch {
      // non-fatal
    } finally {
      setBookingsLoading(false);
    }
  }

  useEffect(() => {
    void load(0);
  }, []);

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    setOffset(0);
    void load(0, s);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <option value="">All statuses</option>
          {Object.entries(BOOKING_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <p className="text-sm text-zinc-500">{bookingList.length} bookings</p>
      </div>

      {bookingsLoading && bookingList.length === 0 && (
        <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Property</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {bookingList.map((b) => (
              <tr key={b.id} className="bg-white dark:bg-zinc-900">
                <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                  {b.referenceCode}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">{b.guestName}</p>
                  <p className="text-zinc-400">{b.guestEmail}</p>
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {b.propertyName}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(b.checkIn + 'T00:00:00').toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' → '}
                  {new Date(b.checkOut + 'T00:00:00').toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                  ₱{(b.totalMinor / 100).toLocaleString('en-PH')}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${BOOKING_STATUS_COLOURS[b.status] ?? ''}`}
                  >
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => load(offset)}
          disabled={bookingsLoading}
          className="flex h-10 w-full items-center justify-center rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          {bookingsLoading ? 'Loading…' : 'Load more'}
        </button>
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
