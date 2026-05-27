'use client';

import { useEffect, useState } from 'react';

type Props = {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  onRangeChange: (checkIn: string, checkOut: string) => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function DateRangeCalendar({ propertyId, checkIn, checkOut, onRangeChange }: Props) {
  const today = todayStr();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<'in' | 'out'>('in');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Load blocked dates for current + next month
  useEffect(() => {
    const from = isoDate(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 2, 0).getDate();
    const to = isoDate(viewYear, viewMonth + 1, lastDay);

    fetch(`${API_URL}/properties/${propertyId}/blocked-dates?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((res: { data: string[] }) => setBlocked(new Set(res.data)))
      .catch(() => {});
  }, [propertyId, viewYear, viewMonth]);

  function handleDayClick(date: string) {
    if (date < today || blocked.has(date)) return;

    if (selecting === 'in') {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().slice(0, 10);
      onRangeChange(date, nextDayStr);
      setSelecting('out');
    } else {
      if (date <= checkIn) {
        // Clicked before or same as check-in — restart
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        onRangeChange(date, nextDay.toISOString().slice(0, 10));
        setSelecting('out');
      } else {
        onRangeChange(checkIn, date);
        setSelecting('in');
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const months = [
    { year: viewYear, month: viewMonth },
    viewMonth === 11 ? { year: viewYear + 1, month: 0 } : { year: viewYear, month: viewMonth + 1 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <span className="text-xs font-medium text-zinc-500">
          {selecting === 'in' ? 'Select check-in' : 'Select check-out'}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            today={today}
            checkIn={checkIn}
            checkOut={checkOut}
            blocked={blocked}
            hoverDate={hoverDate}
            selecting={selecting}
            onDayClick={handleDayClick}
            onDayHover={setHoverDate}
          />
        ))}
      </div>

      <div className="flex gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-zinc-900 dark:bg-zinc-50" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />{' '}
          Unavailable
        </span>
      </div>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  today,
  checkIn,
  checkOut,
  blocked,
  hoverDate,
  selecting,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  today: string;
  checkIn: string;
  checkOut: string;
  blocked: Set<string>;
  hoverDate: string | null;
  selecting: 'in' | 'out';
  onDayClick: (d: string) => void;
  onDayHover: (d: string | null) => void;
}) {
  const monthName = new Date(year, month).toLocaleString('en-PH', {
    month: 'long',
    year: 'numeric',
  });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Preview end date while hovering in 'out' mode
  const previewOut = selecting === 'out' && hoverDate && hoverDate > checkIn ? hoverDate : null;
  const rangeEnd = previewOut ?? checkOut;

  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(year, month, i + 1)),
  ];

  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {monthName}
      </p>
      <div className="grid grid-cols-7 gap-px text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-zinc-400">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const isPast = date < today;
          const isBlocked = blocked.has(date);
          const isDisabled = isPast || isBlocked;
          const isCheckIn = date === checkIn;
          const isCheckOut = date === rangeEnd;
          const inRange = date > checkIn && date < rangeEnd;

          let cls =
            'relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors ';

          if (isCheckIn || isCheckOut) {
            cls += 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 font-semibold ';
          } else if (inRange) {
            cls += 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ';
          } else if (isDisabled) {
            cls += 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed ';
            if (isBlocked) cls += 'line-through ';
          } else {
            cls +=
              'text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer ';
          }

          return (
            <button
              key={date}
              type="button"
              disabled={isDisabled}
              onClick={() => onDayClick(date)}
              onMouseEnter={() => onDayHover(date)}
              onMouseLeave={() => onDayHover(null)}
              className={cls}
            >
              {new Date(date + 'T00:00:00').getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
