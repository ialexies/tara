'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  propertyId?: string | null;
  checkIn: string;
  checkOut: string;
  onRangeChange: (checkIn: string, checkOut: string) => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtShort(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', weekday: 'short' });
}

function nightCount(ci: string, co: string) {
  if (!ci || !co) return 0;
  return Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

export function DateRangeCalendar({ propertyId, checkIn, checkOut, onRangeChange }: Props) {
  const today = todayStr();
  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<'in' | 'out'>('in');
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Fetch blocked dates when propertyId is set
  useEffect(() => {
    if (!propertyId) return;
    const from = isoDate(viewYear, viewMonth, 1);
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const lastDay = new Date(nextYear, nextMonth + 1, 0).getDate();
    const to = isoDate(nextYear, nextMonth, lastDay);
    fetch(`${API_URL}/properties/${propertyId}/blocked-dates?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((res: { data: string[] }) => setBlocked(new Set(res.data)))
      .catch(() => {});
  }, [propertyId, viewYear, viewMonth]);

  function handleDayClick(date: string) {
    if (date < today || blocked.has(date)) return;
    if (selecting === 'in') {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      onRangeChange(date, next.toISOString().slice(0, 10));
      setSelecting('out');
    } else {
      if (date <= checkIn) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        onRangeChange(date, next.toISOString().slice(0, 10));
        setSelecting('out');
      } else {
        onRangeChange(checkIn, date);
        setSelecting('in');
      }
    }
  }

  function prev() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function next() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const nights = nightCount(checkIn, checkOut);
  const previewOut = selecting === 'out' && hoverDate && hoverDate > checkIn ? hoverDate : null;
  const rangeEnd = previewOut ?? checkOut;

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];

  return (
    <div
      className="select-none"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
        touchStartX.current = null;
      }}
    >
      {/* Date display header */}
      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setSelecting('in')}
          className={`flex flex-col gap-0.5 px-4 py-3 text-left transition-colors ${
            selecting === 'in'
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Check-in
          </span>
          <span
            className={`text-sm font-semibold ${checkIn ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400'}`}
          >
            {checkIn ? fmtShort(checkIn) : 'Add date'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => checkIn && setSelecting('out')}
          className={`flex flex-col gap-0.5 border-l border-zinc-200 px-4 py-3 text-left transition-colors dark:border-zinc-700 ${
            selecting === 'out'
              ? 'bg-emerald-50 dark:bg-emerald-950'
              : 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Check-out
          </span>
          <span
            className={`text-sm font-semibold ${checkOut ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400'}`}
          >
            {checkOut ? fmtShort(checkOut) : 'Add date'}
          </span>
          {nights > 0 && (
            <span className="text-xs text-zinc-500">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          )}
        </button>
      </div>

      {/* Month header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={prev}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={next}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-xs font-semibold text-zinc-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />;

          const isPast = date < today;
          const isBlocked = blocked.has(date);
          const isDisabled = isPast || isBlocked;
          const isCheckIn = date === checkIn;
          const isCheckOut = date === rangeEnd;
          const inRange = checkIn && rangeEnd && date > checkIn && date < rangeEnd;

          // Rounded caps on the range highlight
          const isRangeStart = date === checkIn && rangeEnd && checkIn < rangeEnd;
          const isRangeEnd = date === rangeEnd && checkIn && checkIn < rangeEnd;

          return (
            <div
              key={date}
              className={`relative flex h-12 items-center justify-center ${
                inRange
                  ? isRangeStart
                    ? 'rounded-l-full bg-emerald-100 dark:bg-emerald-900/40'
                    : isRangeEnd
                      ? 'rounded-r-full bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-emerald-100 dark:bg-emerald-900/40'
                  : ''
              }`}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleDayClick(date)}
                onMouseEnter={() => !isDisabled && setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isCheckIn || isCheckOut
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : isDisabled
                      ? `cursor-not-allowed text-zinc-300 dark:text-zinc-700 ${isBlocked ? 'line-through' : ''}`
                      : 'cursor-pointer text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {new Date(date + 'T00:00:00').getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Prompt */}
      <p className="mt-3 text-center text-xs text-zinc-400">
        {selecting === 'in' ? 'Tap a date to set check-in' : 'Tap a date to set check-out'}
      </p>
    </div>
  );
}
