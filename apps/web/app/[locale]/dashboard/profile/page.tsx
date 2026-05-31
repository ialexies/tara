'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { api } from '@/lib/api-client';
import { PhoneInput } from '@/components/phone-input';

export default function DashboardProfilePage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const user = firebaseAuth.currentUser;
    if (user?.email) setEmail(user.email);
    api.profile
      .get()
      .then((res) => {
        const p = res as {
          profile?: { firstName?: string | null; lastName?: string | null; phone?: string | null };
        };
        if (!p.profile) return;
        if (p.profile.firstName) setFirstName(p.profile.firstName);
        if (p.profile.lastName) setLastName(p.profile.lastName);
        if (p.profile.phone) setPhone(p.profile.phone);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await api.profile.update({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        fullName: [firstName, lastName].filter(Boolean).join(' ') || undefined,
        phone: phone || undefined,
      });
      setSuccess('Profile updated');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';
  const labelClass = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile</h1>

      <DarkModeToggle />

      <form onSubmit={handleSave} className="space-y-4">
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Personal information
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="dela Cruz"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Phone / WhatsApp</label>
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Account</p>
          <div className="space-y-1.5">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className={`${inputClass} cursor-default opacity-60`}
            />
            <p className="text-xs text-zinc-400">
              To change your email or password,{' '}
              <Link
                href={`/${locale}/bookings/profile`}
                className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                go to your guest profile
              </Link>
              .
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function DarkModeToggle(): React.ReactElement {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('tara_theme') as 'system' | 'light' | 'dark') ?? 'system';
  });

  function apply(t: 'system' | 'light' | 'dark') {
    setTheme(t);
    localStorage.setItem('tara_theme', t);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle(
      'dark',
      t === 'dark' || (t === 'system' && prefersDark),
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Theme</p>
      <div className="flex gap-2">
        {(['system', 'light', 'dark'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => apply(t)}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
              theme === t
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
