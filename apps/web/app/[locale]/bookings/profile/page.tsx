'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { api } from '@/lib/api-client';
import { PhoneInput } from '@/components/phone-input';

const NATIONALITIES = [
  'Filipino',
  'American',
  'Australian',
  'British',
  'Canadian',
  'Chinese',
  'French',
  'German',
  'Indonesian',
  'Japanese',
  'Korean',
  'Malaysian',
  'Singaporean',
  'Spanish',
  'Thai',
  'Other',
];

export default function ProfilePage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
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
          profile?: {
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
            dateOfBirth?: string | null;
            nationality?: string | null;
          };
        };
        const profile = p.profile;
        if (!profile) return;
        if (profile.firstName) setFirstName(profile.firstName);
        if (profile.lastName) setLastName(profile.lastName);
        if (profile.phone) setPhone(profile.phone);
        if (profile.dateOfBirth) setDateOfBirth(profile.dateOfBirth);
        if (profile.nationality) setNationality(profile.nationality);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    const user = firebaseAuth.currentUser;
    if (!user) {
      setError('Not signed in');
      setSaving(false);
      return;
    }

    try {
      if ((email !== user.email || newPassword) && currentPassword) {
        const cred = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, cred);
      }

      const displayName = [firstName, lastName].filter(Boolean).join(' ');
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      if (email !== user.email) {
        await updateEmail(user, email);
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
        setNewPassword('');
        setCurrentPassword('');
      }

      await api.profile.update({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        fullName: displayName || undefined,
        phone: phone || undefined,
        dateOfBirth: dateOfBirth || undefined,
        nationality: nationality || undefined,
      });

      setSuccess('Profile updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('requires-recent-login') || msg.includes('wrong-password')) {
        setError('Enter your current password to change email or password.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';
  const labelClass = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/${locale}/bookings`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← My bookings
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Profile</h1>
        <div className="mb-6">
          <DarkModeToggle />
        </div>

        <form onSubmit={handleSave} className="space-y-5">
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

          {/* Personal info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Personal information
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>Date of birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Nationality</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Account</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClass}
                />
              </div>

              {(email !== (firebaseAuth?.currentUser?.email ?? '') || newPassword) && (
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Current password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required to change email or password"
                    required
                    className={inputClass}
                  />
                </div>
              )}
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
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines
      </footer>
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
    const useDark = t === 'dark' || (t === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', useDark);
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
