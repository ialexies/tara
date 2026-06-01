'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
};

const ROLE_COLOURS: Record<string, string> = {
  guest: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  owner: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

export default function AdminUsersPage(): React.ReactElement {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.admin
      .listUsers()
      .then((r) => setUsers(r.data as UserRow[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSetRole(id: string, role: string) {
    setActing(id);
    try {
      await api.admin.setUserRole(id, role);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActing(null);
    }
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.fullName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Users</h1>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email or name…"
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading…</div>}
      <p className="text-sm text-zinc-400">{filtered.length} users</p>
      <ul className="space-y-2">
        {filtered.map((u) => (
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
    </div>
  );
}
