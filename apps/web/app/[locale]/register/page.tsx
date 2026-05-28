'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth, googleProvider, isFirebaseConfigured } from '@/lib/firebase-client';
import { syncProfileAction, establishSessionAction } from '@/lib/auth-actions';

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('auth.register');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Prevents the onAuthStateChanged listener from racing with an in-flight signup.
  // createUserWithEmailAndPassword / signInWithPopup both trigger auth state changes,
  // which would call finishSignIn with role:'guest' before the explicit call with the
  // user-selected role — creating the DB row as guest before we can set it to owner.
  const signingIn = useRef(false);

  async function finishSignIn(
    user: import('firebase/auth').User,
    profile: { fullName?: string; role?: 'guest' | 'owner' },
  ): Promise<void> {
    const idToken = await user.getIdToken();
    const sync = await syncProfileAction(idToken, profile);
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

  async function handleEmailSignUp(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    signingIn.current = true;
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    const fullName = String(data.get('fullName') ?? '');
    const role = (data.get('role') as 'guest' | 'owner') ?? 'guest';

    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (fullName) {
        await updateProfile(cred.user, { displayName: fullName });
      }
      await sendEmailVerification(cred.user).catch(() => {});
      await finishSignIn(cred.user, { fullName: fullName || undefined, role });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      setError(friendlyError(code, t) ?? t('errors.failed'));
    } finally {
      signingIn.current = false;
      setPending(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    setError(null);
    setPending(true);
    signingIn.current = true;
    try {
      // Popup avoids the third-party-storage isolation problem on localhost.
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      await finishSignIn(cred.user, {
        fullName: cred.user.displayName ?? undefined,
        role: 'guest',
      });
    } catch (err: unknown) {
      console.error('[google sign-in]', err);
      const code = (err as { code?: string }).code;
      setError(friendlyError(code, t) ?? t('errors.googleFailed'));
      setPending(false);
    } finally {
      signingIn.current = false;
    }
  }

  // If user is already authenticated in Firebase (page refresh), finish sign-in.
  // Skip if an explicit signup is in flight — that flow calls finishSignIn with the
  // correct role itself, and we must not race it with a hardcoded 'guest' role here.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let handled = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (handled || !user || signingIn.current) return;
      handled = true;
      setPending(true);
      void finishSignIn(user, {
        fullName: user.displayName ?? undefined,
        role: 'guest',
      });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          {t('title')}
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>

        {hydrated && isFirebaseConfigured && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={pending}
              className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white text-base font-medium text-zinc-900 transition-opacity hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              <GoogleIcon />
              {t('withGoogle')}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs uppercase tracking-wider text-zinc-400">{t('or')}</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}

          <fieldset className="flex gap-3">
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('roleLabel')}…
            </legend>
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 has-[:checked]:border-zinc-900 has-[:checked]:ring-2 has-[:checked]:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:has-[:checked]:border-zinc-100">
              <input
                type="radio"
                name="role"
                value="guest"
                defaultChecked
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t('guestRole')}
              </span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 has-[:checked]:border-zinc-900 has-[:checked]:ring-2 has-[:checked]:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:has-[:checked]:border-zinc-100">
              <input
                type="radio"
                name="role"
                value="owner"
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t('ownerRole')}
              </span>
            </label>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('fullName')} <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
              placeholder="Maria Santos"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={pending || !hydrated}
            className="mt-2 flex h-12 items-center justify-center rounded-lg bg-zinc-900 text-base font-semibold text-white transition-opacity disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {pending ? t('submitting') : t('submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t('hasAccount')}{' '}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            {t('signIn')}
          </Link>
        </p>
      </div>
    </main>
  );
}

function friendlyError(code: string | undefined, t: (key: string) => string): string | null {
  switch (code) {
    case 'auth/email-already-in-use':
      return t('errors.alreadyRegistered');
    case 'auth/weak-password':
      return t('errors.weakPassword');
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
