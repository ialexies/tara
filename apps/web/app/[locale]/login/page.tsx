'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/lib/firebase-client';
import { syncProfileAction, establishSessionAction } from '@/lib/auth-actions';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState('');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  async function finishSignIn(user: import('firebase/auth').User): Promise<void> {
    const idToken = await user.getIdToken();
    const sync = await syncProfileAction(idToken, {});
    if ('error' in sync) {
      setError(sync.error);
      return;
    }
    const refreshed = await user.getIdToken(true);
    const session = await establishSessionAction(refreshed);
    if (session && 'error' in session) {
      setError(session.error);
      return;
    }
    router.push(`/${locale}`);
  }

  // If the user is already authenticated in Firebase but the app has no session
  // cookie yet (e.g. page refresh after sign-in), finish the sign-in.
  useEffect(() => {
    let handled = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (handled || !user) return;
      handled = true;
      setPending(true);
      void finishSignIn(user);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const data = new FormData(e.currentTarget);
    const password = String(data.get('password') ?? '');
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await finishSignIn(cred.user);
    } catch (err: unknown) {
      setError(friendlyError((err as { code?: string }).code) ?? 'Sign-in failed');
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      // Popup avoids the third-party-storage isolation problem that breaks
      // signInWithRedirect on localhost (helper page lives on a different origin).
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      await finishSignIn(cred.user);
    } catch (err: unknown) {
      console.error('[google sign-in]', err);
      setError(friendlyError((err as { code?: string }).code) ?? 'Google sign-in failed');
      setPending(false);
    }
  }

  async function handlePasswordReset(): Promise<void> {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Enter your email above first, then click Forgot password.');
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setInfo(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err: unknown) {
      setError(friendlyError((err as { code?: string }).code) ?? 'Could not send reset email');
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to your Tara account
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pending || !hydrated}
          className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white text-base font-medium text-zinc-900 transition-opacity hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-xs uppercase tracking-wider text-zinc-400">or</span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {info}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-xs font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending || !hydrated}
            className="mt-2 flex h-12 items-center justify-center rounded-lg bg-zinc-900 text-base font-semibold text-white transition-opacity disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No account?{' '}
          <Link
            href={`/${locale}/register`}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

function friendlyError(code: string | undefined): string | null {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.';
    default:
      return null;
  }
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
