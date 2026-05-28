'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type StaffMember = {
  id: string;
  staffEmail: string;
  role: string;
  createdAt: string;
};

export default function PropertyStaffPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'cohost' | 'manager'>('cohost');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.propertyStaff
      .list(propertyId)
      .then((res) => setStaff(res.data as StaffMember[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [propertyId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.propertyStaff.invite(propertyId, email, role);
      setShowForm(false);
      setEmail('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
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
            Staff & co-hosts
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Invite staff to manage bookings for this property.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + Invite
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Invite staff
          </h2>
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff@example.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'cohost' | 'manager')}
                  className={inputClass}
                >
                  <option value="cohost">Co-host (view bookings)</option>
                  <option value="manager">Manager (full access)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {submitting ? '…' : 'Invite'}
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

      {!loading && staff.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No staff yet. Invite co-hosts or managers to help manage this property.
          </p>
        </div>
      )}

      {staff.length > 0 && (
        <ul className="space-y-3">
          {staff.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {s.staffEmail}
                </p>
                <p className="text-xs capitalize text-zinc-500">{s.role}</p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Remove this staff member?')) return;
                  await api.propertyStaff.remove(propertyId, s.id);
                  load();
                }}
                className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
