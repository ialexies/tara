'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { registerAction } from '@/lib/auth-actions';

export default function RegisterPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [state, action, pending] = useActionState(registerAction, null);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Join Tara
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          Find hostels or list your property
        </p>

        <form action={action} className="flex flex-col gap-4">
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </p>
          )}

          {/* Role picker — guest vs owner */}
          <fieldset className="flex gap-3">
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              I want to…
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
                Book hostels
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
                List a property
              </span>
            </label>
          </fieldset>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Full name <span className="font-normal text-zinc-400">(optional)</span>
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
              Email
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
              Password
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
            disabled={pending}
            className="mt-2 flex h-12 items-center justify-center rounded-lg bg-zinc-900 text-base font-semibold text-white transition-opacity disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
