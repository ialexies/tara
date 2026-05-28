'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type PriceRule = {
  id: string;
  name: string;
  roomId: string | null;
  startDate: string;
  endDate: string;
  minNights: number | null;
  rateOverrideMinor: number | null;
};

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

export default function PricingPage(): React.ReactElement {
  const { locale, id: propertyId } = useParams<{ locale: string; id: string }>();

  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  function load() {
    setLoading(true);
    api.priceRules
      .list(propertyId)
      .then((res) => setRules(res.data as PriceRule[]))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [propertyId]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this price rule?')) return;
    setDeleting(id);
    try {
      await api.priceRules.remove(propertyId, id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/dashboard/properties/${propertyId}/rooms`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Rooms
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pricing rules</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Override rates or set minimum stays for specific date ranges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {(['list', 'calendar'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === m ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50' : 'text-zinc-500'}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            + Add rule
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}

      {!loading && rules.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No pricing rules yet.</p>
          <p className="text-xs text-zinc-400">
            Add rules for peak seasons, holidays, or minimum stays.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Add rule
          </button>
        </div>
      )}

      {!loading && rules.length > 0 && viewMode === 'calendar' && (
        <PricingCalendar rules={rules} month={calendarMonth} onMonthChange={setCalendarMonth} />
      )}

      {!loading && rules.length > 0 && viewMode === 'list' && (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{rule.name}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {rule.startDate} → {rule.endDate}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {rule.minNights && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        Min. {rule.minNights} nights
                      </span>
                    )}
                    {rule.rateOverrideMinor && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        ₱{(rule.rateOverrideMinor / 100).toLocaleString('en-PH')}/night
                      </span>
                    )}
                    {rule.roomId && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        Specific room
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting === rule.id}
                  className="flex h-9 items-center rounded-lg border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
                >
                  {deleting === rule.id ? '…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <AddRuleForm
          propertyId={propertyId}
          onSuccess={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function AddRuleForm({
  propertyId,
  onSuccess,
  onCancel,
}: {
  propertyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [minNights, setMinNights] = useState('');
  const [rateOverride, setRateOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!minNights && !rateOverride) {
      setError('Set at least a minimum nights requirement or a rate override.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.priceRules.create(propertyId, {
        name,
        startDate,
        endDate,
        minNights: minNights ? parseInt(minNights) : null,
        rateOverrideMinor: rateOverride ? Math.round(parseFloat(rateOverride) * 100) : null,
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        New pricing rule
      </h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Rule name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Holy Week 2025, Christmas Peak"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Start date <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              End date <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Minimum nights
            </span>
            <input
              type="number"
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              min="1"
              placeholder="e.g. 2"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Rate override (₱/night)
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                ₱
              </span>
              <input
                type="number"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                min="1"
                placeholder="e.g. 900"
                className={`${inputClass} pl-7`}
              />
            </div>
          </label>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? 'Saving…' : 'Save rule'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PricingCalendar({
  rules,
  month,
  onMonthChange,
}: {
  rules: PriceRule[];
  month: string;
  onMonthChange: (m: string) => void;
}): React.ReactElement {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDow = new Date(year, mon - 1, 1).getDay();

  function rulesForDate(day: number): PriceRule[] {
    const date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return rules.filter((r) => r.startDate <= date && r.endDate >= date);
  }

  function prevMonth() {
    const d = new Date(year, mon - 2, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(year, mon, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-sm dark:border-zinc-700"
        >
          ‹
        </button>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{monthLabel}</p>
        <button
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-sm dark:border-zinc-700"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayRules = rulesForDate(day);
          const hasRate = dayRules.some((r) => r.rateOverrideMinor);
          const hasMin = dayRules.some((r) => r.minNights);
          return (
            <div
              key={day}
              title={dayRules.map((r) => r.name).join(', ')}
              className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors ${hasRate ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''} ${hasMin && !hasRate ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''} ${!hasRate && !hasMin ? 'text-zinc-700 dark:text-zinc-300' : ''} `}
            >
              {day}
              {hasRate && (
                <span className="text-[8px] text-emerald-600 dark:text-emerald-400">
                  ₱
                  {(dayRules.find((r) => r.rateOverrideMinor)!.rateOverrideMinor! / 100).toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900" />
          Rate override
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-900" />
          Min nights
        </span>
      </div>
    </div>
  );
}
