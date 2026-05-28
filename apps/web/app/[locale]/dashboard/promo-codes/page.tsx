'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

type PromoCode = {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function PromoCodesPage(): React.ReactElement {
  const { locale } = useParams<{ locale: string }>();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  function load() {
    api.promoCodes
      .list()
      .then((res) => setCodes(res.data as PromoCode[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.promoCodes.create({
        code: code.toUpperCase(),
        discountType,
        discountValue: parseInt(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
      });
      setShowForm(false);
      setCode('');
      setDiscountValue('');
      setMaxUses('');
      setValidFrom('');
      setValidTo('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50';

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
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Promo Codes</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          + New code
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Create promo code
          </h2>
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                  className={inputClass}
                >
                  <option value="percent">Percent off (%)</option>
                  <option value="flat">Flat amount (₱)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  {discountType === 'percent' ? 'Percent (1–100)' : 'Amount (₱)'}
                </label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  min={1}
                  max={discountType === 'percent' ? 100 : undefined}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">
                  Max uses (blank = unlimited)
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min={1}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Valid from</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Valid to</label>
                <input
                  type="date"
                  value={validTo}
                  min={validFrom}
                  onChange={(e) => setValidTo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {submitting ? '…' : 'Create code'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-10 items-center rounded-lg border border-zinc-200 px-4 text-sm text-zinc-500 dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}
      {!loading && codes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No promo codes yet. Create one to offer discounts.
          </p>
        </div>
      )}
      {codes.length > 0 && (
        <ul className="space-y-3">
          {codes.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {c.code}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500">
                  {c.discountType === 'percent'
                    ? `${c.discountValue}% off`
                    : `₱${(c.discountValue / 100).toLocaleString('en-PH')} off`}
                  {' · '}
                  {c.usesCount}
                  {c.maxUses ? `/${c.maxUses}` : ''} uses
                  {c.validTo && ` · expires ${c.validTo}`}
                </p>
              </div>
              {c.isActive && (
                <button
                  onClick={async () => {
                    if (!confirm('Deactivate this code?')) return;
                    await api.promoCodes.deactivate(c.id);
                    load();
                  }}
                  className="flex h-8 items-center rounded-lg border border-zinc-200 px-3 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700"
                >
                  Deactivate
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
