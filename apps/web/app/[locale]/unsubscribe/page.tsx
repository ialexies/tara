import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Unsubscribe | Tara' };

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): React.ReactElement {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <p className="mb-2 text-3xl">✅</p>
        <h1 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          You've been unsubscribed
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          You'll no longer receive transactional emails from Tara. Note: booking confirmation emails
          required for your reservations may still be sent.
        </p>
        <Link
          href="/en"
          className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Back to Tara
        </Link>
      </div>
    </main>
  );
}
