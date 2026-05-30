'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

type MonthRow = { month: string; totalMinor: number; bookingCount: number };

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-PH', {
    month: 'short',
    year: '2-digit',
  });
}

export function RevenueChart() {
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.properties
      .revenueByMonth()
      .then((res) => setRows(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />;
  }

  if (rows.length === 0) return null;

  const maxMinor = Math.max(...rows.map((r) => r.totalMinor), 1);
  const BAR_H = 120;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Revenue by month
      </h2>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-end gap-2 overflow-x-auto pb-1">
          {rows.map((r) => {
            const barH = Math.max(4, Math.round((r.totalMinor / maxMinor) * BAR_H));
            return (
              <div
                key={r.month}
                className="group flex min-w-[40px] flex-1 flex-col items-center gap-1"
              >
                <span className="invisible text-xs text-zinc-500 group-hover:visible">
                  ₱{(r.totalMinor / 100).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                </span>
                <div
                  className="w-full rounded-t bg-emerald-500 dark:bg-emerald-600"
                  style={{ height: `${barH}px` }}
                />
                <span className="text-[10px] text-zinc-400">{formatMonth(r.month)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-right text-xs text-zinc-400">
          Total:{' '}
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            ₱{(rows.reduce((s, r) => s + r.totalMinor, 0) / 100).toLocaleString('en-PH')}
          </span>{' '}
          over {rows.length} month{rows.length !== 1 ? 's' : ''}
        </p>
      </div>
    </section>
  );
}
