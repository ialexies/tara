import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Tara',
  description: 'Terms of Service for the Tara hostel booking platform.',
};

export default async function TermsPage({
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

        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Terms of Service
        </h1>
        <p className="mb-8 text-sm text-zinc-500">Last updated: May 2026</p>

        <div className="prose prose-zinc max-w-none space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              1. Acceptance
            </h2>
            <p>
              By using Tara, you agree to these Terms of Service. If you do not agree, do not use
              the platform. Tara is a marketplace connecting guests with hostel owners in the
              Philippines.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              2. Bookings
            </h2>
            <p>
              Bookings are agreements between guests and property owners. Tara facilitates the
              transaction but is not a party to the accommodation contract. Owners are responsible
              for the accuracy of their listings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              3. Cancellations & Refunds
            </h2>
            <p>
              Cancellations made at least 48 hours before check-in are eligible for a full refund.
              Cancellations within 48 hours of check-in are non-refundable unless the owner agrees
              otherwise. Refunds for card payments are processed within 5–10 business days.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              4. User Conduct
            </h2>
            <p>
              You agree not to submit false or misleading information, misuse the platform, or
              interfere with other users. Owners may cancel reservations from guests who violate
              property rules.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              5. Payments
            </h2>
            <p>
              Card payments are processed by Stripe. Manual payments (GCash, bank transfer) are made
              directly to the property and are the responsibility of the guest and owner to
              complete. Tara does not hold funds for manual bookings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              6. Liability
            </h2>
            <p>
              Tara is provided "as is" without warranties. We are not liable for property
              conditions, cancellations by owners, or losses arising from use of the platform beyond
              the amount paid for your booking.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              7. Changes
            </h2>
            <p>
              We may update these terms at any time. Continued use of the platform constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              8. Contact
            </h2>
            <p>
              Questions? Email us at{' '}
              <a
                href="mailto:hello@tara-stays.com"
                className="text-zinc-900 underline dark:text-zinc-50"
              >
                hello@tara-stays.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="pb-safe border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Tara · Philippines ·{' '}
        <Link href={`/${locale}/privacy`} className="hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
