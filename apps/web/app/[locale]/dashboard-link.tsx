'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { isFirebaseConfigured } from '@/lib/firebase-client';

const PENDING_STATUSES = ['stripe_pending', 'manual_pending', 'awaiting_verification'];

type BookingRow = { booking: { status: string } };

export function DashboardLink({
  locale,
  label,
}: {
  locale: string;
  label: string;
}): React.ReactElement {
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    api.properties
      .list()
      .then(async (res) => {
        const props = res.data as { id: string }[];
        let total = 0;
        await Promise.all(
          props.map(async (p) => {
            try {
              const rows = await api.bookings.listByProperty(p.id);
              const pending = (rows.data as BookingRow[]).filter((r) =>
                PENDING_STATUSES.includes(r.booking.status),
              );
              total += pending.length;
            } catch {
              // non-fatal
            }
          }),
        );
        setBadge(total);
      })
      .catch(() => {});
  }, []);

  return (
    <Link
      href={`/${locale}/dashboard`}
      className="relative flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
    >
      {label}
      {badge > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}
