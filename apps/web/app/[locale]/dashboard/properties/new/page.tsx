'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

const PROPERTY_TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;
const REGIONS = [
  'metro manila',
  'cebu',
  'davao',
  'zambales',
  'palawan',
  'bohol',
  'siargao',
  'batangas',
  'iloilo',
  'cagayan de oro',
  'other',
] as const;

const STEPS = ['Basics', 'Location', 'Payment', 'Description'] as const;

type Step = (typeof STEPS)[number];

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </label>
  );
}

export default function NewPropertyPage(): React.ReactElement {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]>('hostel');
  const [region, setRegion] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [paymentMode, setPaymentMode] = useState<'manual' | 'stripe'>('manual');
  const [gcash, setGcash] = useState('');
  const [maya, setMaya] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRegion = region === 'other' ? customRegion : region;

  function canNext() {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return effectiveRegion.trim().length > 0 && city.trim().length > 0;
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.properties.create({
        name: name.trim(),
        propertyType,
        region: effectiveRegion.toLowerCase().trim(),
        city: city.trim(),
        addressLine: addressLine.trim() || undefined,
        paymentMode,
        description: description.trim() || undefined,
        manualPaymentMethods:
          paymentMode === 'manual' && (gcash || maya)
            ? { gcash: gcash || undefined, maya: maya || undefined }
            : undefined,
      });
      const created = result as { id: string };
      router.push(`/${locale}/dashboard/properties/${created.id}/rooms`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? 'bg-emerald-600 text-white'
                    : i === step
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-6 sm:w-12 ${i < step ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                />
              )}
            </div>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{STEPS[step]}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Step 0 — Basics */}
      {step === 0 && (
        <div className="space-y-5">
          <Field
            label="Property name"
            required
            hint="Use the name guests will recognise, e.g. 'Anawangin Surf Hostel'"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Anawangin Cove Hostel"
              className={inputClass}
            />
          </Field>
          <Field label="Property type" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPropertyType(t)}
                  className={`h-11 rounded-xl border text-sm font-medium capitalize transition-colors ${
                    propertyType === t
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Step 1 — Location */}
      {step === 1 && (
        <div className="space-y-5">
          <Field label="Region" required>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputClass}
            >
              <option value="">Select region…</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          {region === 'other' && (
            <Field label="Region name" required>
              <input
                type="text"
                value={customRegion}
                onChange={(e) => setCustomRegion(e.target.value)}
                placeholder="e.g. oriental mindoro"
                className={inputClass}
              />
            </Field>
          )}
          <Field label="City / Municipality" required>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder="e.g. San Antonio"
              className={inputClass}
            />
          </Field>
          <Field
            label="Street address (optional)"
            hint="Helps guests find you — you can add this later"
          >
            <input
              type="text"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              maxLength={200}
              placeholder="Street, barangay, landmark"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {/* Step 2 — Payment */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-zinc-500">How will guests pay for their booking?</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                value: 'manual',
                label: 'GCash / bank transfer',
                desc: 'Guests send payment via GCash, Maya, or bank. You confirm manually.',
              },
              {
                value: 'stripe',
                label: 'Online card payments',
                desc: 'Guests pay by credit/debit card via Stripe. Requires Stripe account setup.',
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMode(opt.value as typeof paymentMode)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  paymentMode === opt.value
                    ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-800'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{opt.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{opt.desc}</p>
              </button>
            ))}
          </div>
          {paymentMode === 'manual' && (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Payment numbers (optional)
              </p>
              <Field label="GCash number">
                <input
                  type="tel"
                  value={gcash}
                  onChange={(e) => setGcash(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className={inputClass}
                />
              </Field>
              <Field label="Maya number">
                <input
                  type="tel"
                  value={maya}
                  onChange={(e) => setMaya(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Description */}
      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm text-zinc-500">
            Tell guests what makes your place special. You can always edit this later.
          </p>
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Describe your hostel — the vibe, nearby attractions, what's included, check-in process…"
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-right text-xs text-zinc-400">{description.length} / 1000</p>
          </Field>

          {/* Summary */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
            <p className="mt-0.5 capitalize text-zinc-500">
              {propertyType} · {city}, {effectiveRegion}
            </p>
            <p className="mt-0.5 text-zinc-500">
              {paymentMode === 'manual' ? 'Manual payments' : 'Card payments (Stripe)'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
          className="flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create property'}
          </button>
        )}
      </div>
    </div>
  );
}
