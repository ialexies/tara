'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api-client';

type PlatformStats = {
  activeProperties: number;
  totalOwners: number;
  totalUsers: number;
  bookingsThisMonth: number;
  revenueThisMonthMinor: number;
};

type RevenueMonth = { month: string; totalMinor: number; bookingCount: number };

type PendingProperty = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
  ownerEmail: string | null;
  ownerName: string | null;
};

type RecentBooking = {
  id: string;
  referenceCode: string;
  guestName: string;
  guestEmail: string;
  totalMinor: number;
  status: string;
  propertyName: string;
  createdAt: string;
};

const STATUS_COLOURS: Record<string, string> = {
  stripe_pending: 'bg-blue-100 text-blue-700',
  manual_pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-zinc-100 text-zinc-600',
  cancelled: 'bg-red-100 text-red-600',
};

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-PH', { month: 'short' });
}

export default function AdminHomePage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueMonth[]>([]);
  const [pending, setPending] = useState<PendingProperty[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .stats()
      .then(setStats)
      .catch(() => {});
    api.admin
      .revenueByMonth()
      .then((r) => setRevenue(r.data as RevenueMonth[]))
      .catch(() => {});
    api.properties
      .adminListAll()
      .then((r) => {
        const all = r.data as PendingProperty[];
        setPending(all.filter((p) => p.status === 'pending').slice(0, 5));
      })
      .catch(() => {});
    api.admin
      .listAllBookings({ limit: 5, offset: 0 })
      .then((r) => setRecentBookings(r.data as RecentBooking[]))
      .catch(() => {});
  }, []);

  async function handleApprove(id: string) {
    setActing(id);
    try {
      await api.properties.adminSetStatus(id, 'active');
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // non-fatal
    } finally {
      setActing(null);
    }
  }

  const chartData = revenue.map((r) => ({
    month: formatMonth(r.month),
    revenue: Math.round(r.totalMinor / 100),
    bookings: r.bookingCount,
  }));

  const statCards = stats
    ? [
        { label: 'Active properties', value: stats.activeProperties, color: 'text-emerald-600' },
        { label: 'Total owners', value: stats.totalOwners, color: 'text-blue-600' },
        {
          label: 'Total users',
          value: stats.totalUsers,
          color: 'text-zinc-700 dark:text-zinc-300',
        },
        {
          label: 'Bookings this month',
          value: stats.bookingsThisMonth,
          color: 'text-zinc-700 dark:text-zinc-300',
        },
        {
          label: 'Revenue this month',
          value: `₱${(stats.revenueThisMonthMinor / 100).toLocaleString('en-PH')}`,
          color: 'text-zinc-700 dark:text-zinc-300',
          wide: true,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statCards.map(({ label, value, color, wide }) => (
            <div
              key={label}
              className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Revenue — last 6 months
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#a1a1aa' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                formatter={(v: number) => [`₱${v.toLocaleString('en-PH')}`, 'Revenue']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e4e4e7',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent bookings */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent bookings</p>
            <Link
              href={`/${locale}/admin/bookings`}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              View all →
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {b.guestName}
                    </p>
                    <p className="truncate text-xs text-zinc-400">{b.propertyName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      ₱{(b.totalMinor / 100).toLocaleString('en-PH')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOURS[b.status] ?? 'bg-zinc-100 text-zinc-500'}`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending properties */}
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Pending approval
              {pending.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  {pending.length}
                </span>
              )}
            </p>
            <Link
              href={`/${locale}/admin/properties`}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              View all →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">No pending properties.</p>
          ) : (
            <ul className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {p.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {p.city} · {p.ownerName ?? p.ownerEmail ?? '—'}
                    </p>
                  </div>
                  <button
                    disabled={acting === p.id}
                    onClick={() => handleApprove(p.id)}
                    className="flex h-8 shrink-0 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting === p.id ? '…' : 'Approve'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
