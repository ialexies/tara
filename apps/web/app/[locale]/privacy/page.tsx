import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Tara',
  description: 'Privacy Policy for the Tara hostel booking platform.',
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3">
          <Link
            href={`/${locale}`}
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href={`/${locale}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← Back
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">Privacy Policy</h1>
        <p className="mb-8 text-sm text-zinc-500">Last updated: May 2026</p>

        <div className="prose prose-zinc max-w-none space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              1. What we collect
            </h2>
            <p>
              We collect information you provide when creating an account (name, email), making a
              booking (contact details, booking preferences), and using the platform (device type,
              page visits). Property owners additionally provide listing details and payment account
              numbers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              2. How we use your data
            </h2>
            <p>
              We use your information to process bookings, send booking confirmations and updates,
              improve the platform, and communicate with you about your account. We do not sell your
              personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              3. Data sharing
            </h2>
            <p>
              Your booking details (name, email, special requests) are shared with the property
              owner to fulfil your reservation. Payment data is processed by Stripe and subject to
              their privacy policy. We use Firebase (Google) for authentication.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              4. Data retention
            </h2>
            <p>
              We retain booking records for 3 years for accounting purposes. Account data is
              retained while your account is active. You may request deletion by contacting us — we
              will anonymise your personal data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              5. Cookies
            </h2>
            <p>
              We use session cookies for authentication and analytics cookies (Cloudflare Web
              Analytics, cookieless) to understand how the platform is used. No advertising cookies
              are used.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              6. Your rights
            </h2>
            <p>
              You have the right to access, correct, or delete your personal data. To exercise these
              rights, email us at{' '}
              <a
                href="mailto:hello@tara-stays.com"
                className="text-zinc-900 underline dark:text-zinc-50"
              >
                hello@tara-stays.com
              </a>{' '}
              with your request.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              7. Security
            </h2>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS),
              secure authentication via Firebase, and access controls. No system is 100% secure —
              please use a strong, unique password.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              8. Contact
            </h2>
            <p>
              For privacy questions:{' '}
              <a
                href="mailto:hello@tara-stays.com"
                className="text-zinc-900 underline dark:text-zinc-50"
              >
                hello@tara-stays.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines ·{' '}
        <Link href={`/${locale}/terms`} className="hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
