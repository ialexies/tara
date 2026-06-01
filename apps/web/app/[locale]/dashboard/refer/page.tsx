'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function ReferralPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ referred: number; converted: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.referral.getMyCode().then((res) => setReferralCode((res as { code: string }).code)),
      api.referral.getMyStats().then(setStats),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const referralUrl =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}/${locale}/register?ref=${referralCode}`
      : '';

  async function copyLink() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Refer a friend</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Share your link — your friend gets a discount on their first booking.
        </p>
      </div>

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && referralCode && (
        <div className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.referred}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">Friends referred</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-2xl font-bold text-emerald-600">{stats.converted}</p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">Booked a stay</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-1 text-xs font-medium text-zinc-500">Your referral code</p>
            <p className="font-mono text-2xl font-bold tracking-widest text-zinc-900 dark:text-zinc-50">
              {referralCode}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium text-zinc-500">Share link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralUrl}
                className="h-10 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              />
              <button
                onClick={copyLink}
                className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              How it works
            </p>
            <ol className="space-y-2 text-sm text-zinc-500">
              <li>1. Share your link with a friend</li>
              <li>2. They sign up and make their first booking using your code</li>
              <li>3. They get a discount — and you earn credit toward your next stay</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
