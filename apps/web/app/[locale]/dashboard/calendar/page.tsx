'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type Property = { id: string; name: string; slug: string };
type OccupancyDay = { date: string; booked: number; available: number };

export default function MultiCalendarPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [occupancy, setOccupancy] = useState<Record<string, OccupancyDay[]>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    api.properties.list().then((res) => {
      const props = res.data as Property[];
      setProperties(props);
      setSelected(new Set(props.map((p) => p.id)));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (properties.length === 0) return;
    const [year, mon] = month.split('-').map(Number) as [number, number];
    const from = month + '-01';
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;

    Promise.all(
      properties.map((p) =>
        api.properties
          .occupancy(p.id, 2)
          .then((res) => ({ id: p.id, data: res.data as OccupancyDay[] }))
          .catch(() => ({ id: p.id, data: [] as OccupancyDay[] })),
      ),
    ).then((results) => {
      const map: Record<string, OccupancyDay[]> = {};
      for (const r of results) {
        map[r.id] = r.data.filter((d) => d.date >= from && d.date <= to);
      }
      setOccupancy(map);
    });
  }, [month, properties]);

  const [year, mon] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDow = new Date(year, mon - 1, 1).getDay();
  const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    const d = new Date(year, mon - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(year, mon, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const visibleProps = properties.filter((p) => selected.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Multi-property calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-sm dark:border-zinc-700"
          >
            ‹
          </button>
          <span className="min-w-[130px] text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-sm dark:border-zinc-700"
          >
            ›
          </button>
        </div>
      </div>

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && properties.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                  return next;
                })
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selected.has(p.id) ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' : 'border border-zinc-200 text-zinc-500 dark:border-zinc-700'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {!loading && visibleProps.length > 0 && (
        <div className="space-y-6">
          {visibleProps.map((prop) => {
            const days = occupancy[prop.id] ?? [];
            const dayMap: Record<string, OccupancyDay> = {};
            for (const d of days) dayMap[d.date] = d;

            return (
              <div
                key={prop.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{prop.name}</p>
                  <Link
                    href={`/${locale}/dashboard/properties/${prop.id}/rooms`}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-zinc-400">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const d = dayMap[dateStr];
                    const isBooked = d && d.booked > 0;
                    const isFull = d && d.available === 0;
                    return (
                      <div
                        key={day}
                        className={`flex h-8 items-center justify-center rounded text-xs font-medium ${isFull ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''} ${isBooked && !isFull ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : ''} ${!isBooked ? 'text-zinc-400' : ''} `}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900" />
                    Full
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900" />
                    Partial
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
