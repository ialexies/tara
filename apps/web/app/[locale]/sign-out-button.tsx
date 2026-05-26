'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';
import { logoutAction } from '@/lib/auth-actions';

export function SignOutButton(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [pending, setPending] = useState(false);

  async function handleSignOut(): Promise<void> {
    setPending(true);
    // Sign out of Firebase first so onAuthStateChanged listeners on /login
    // don't immediately re-establish a session.
    await signOut(firebaseAuth).catch(() => {});
    await logoutAction();
    // Full-page navigation (not router.push) — guarantees Firebase SDK state
    // is fresh so the next signInWithRedirect works cleanly.
    window.location.href = `/${locale}/login`;
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
