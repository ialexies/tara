'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Property = { id: string; name: string };
type OccupancyDay = { date: string; booked: number; available: number; revenue: number };

function monthOptions(): { value: string; label: string }[] {
  const opts = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts.reverse();
}

function getMonthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const lastDay = new Date(year, mon, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export default function ComparePage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propA, setPropA] = useState('');
  const [propB, setPropB] = useState('');
  const [monthA, setMonthA] = useState(() => monthOptions()[0]?.value ?? '');
  const [monthB, setMonthB] = useState(() => monthOptions()[1]?.value ?? '');
  const [dataA, setDataA] = useState<OccupancyDay[]>([]);
  const [dataB, setDataB] = useState<OccupancyDay[]>([]);
  const [loading, setLoading] = useState(false);
  const opts = monthOptions();

  useEffect(() => {
    api.properties.list().then((res) => {
      const props = res.data as Property[];
      setProperties(props);
      if (props[0]) setPropA(props[0].id);
      if (props[1]) setPropB(props[1].id);
      else if (props[0]) setPropB(props[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propA || !propB) return;
    setLoading(true);
    Promise.all([
      api.properties.occupancy(propA, 3).catch(() => ({ data: [] })),
      api.properties.occupancy(propB, 3).catch(() => ({ data: [] })),
    ]).then(([a, b]) => {
      const { from: fromA, to: toA } = getMonthRange(monthA);
      const { from: fromB, to: toB } = getMonthRange(monthB);
      setDataA((a.data as OccupancyDay[]).filter((d) => d.date >= fromA && d.date <= toA));
      setDataB((b.data as OccupancyDay[]).filter((d) => d.date >= fromB && d.date <= toB));
      setLoading(false);
    });
  }, [propA, propB, monthA, monthB]);

  function summarize(data: OccupancyDay[]) {
    const totalDays = data.length;
    const bookedDays = data.filter((d) => d.booked > 0).length;
    const revenue = data.reduce((s, d) => s + (d.revenue ?? 0), 0);
    const occupancyRate = totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;
    return { bookedDays, totalDays, revenue, occupancyRate };
  }

  const sumA = summarize(dataA);
  const sumB = summarize(dataB);

  const selectClass =
    'h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Performance comparison
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Compare two properties or periods side by side.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(['A', 'B'] as const).map((side) => {
          const propVal = side === 'A' ? propA : propB;
          const monthVal = side === 'A' ? monthA : monthB;
          const setProp = side === 'A' ? setPropA : setPropB;
          const setMon = side === 'A' ? setMonthA : setMonthB;
          return (
            <div
              key={side}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Panel {side}
              </p>
              <div className="space-y-2">
                <select
                  value={propVal}
                  onChange={(e) => setProp(e.target.value)}
                  className={`w-full ${selectClass}`}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={monthVal}
                  onChange={(e) => setMon(e.target.value)}
                  className={`w-full ${selectClass}`}
                >
                  {opts.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <div className="py-8 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { sum: sumA, label: 'A' },
            { sum: sumB, label: 'B' },
          ].map(({ sum, label }) => (
            <div
              key={label}
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Panel {label}
              </p>
              <div className="space-y-2">
                <Metric
                  label="Occupancy"
                  value={`${sum.occupancyRate}%`}
                  highlight={sum.occupancyRate > 70}
                />
                <Metric label="Booked days" value={`${sum.bookedDays} / ${sum.totalDays}`} />
                <Metric
                  label="Revenue"
                  value={`₱${(sum.revenue / 100).toLocaleString('en-PH')}`}
                  highlight={sum.revenue > 0}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'}`}
      >
        {value}
      </span>
    </div>
  );
}
