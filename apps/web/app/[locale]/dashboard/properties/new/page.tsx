'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api-client';

const PROPERTY_TYPES = ['hostel', 'hotel', 'guesthouse', 'apartment', 'resort'] as const;
const PAYMENT_MODES = ['manual', 'stripe'] as const;

export default function NewPropertyPage(): React.ReactElement {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]>('hostel');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [paymentMode, setPaymentMode] = useState<(typeof PAYMENT_MODES)[number]>('manual');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.properties.create({
        name,
        propertyType,
        region: region.toLowerCase().trim(),
        city: city.trim(),
        addressLine: addressLine.trim() || undefined,
        paymentMode,
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
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add a property</h1>
        <p className="mt-1 text-sm text-zinc-500">Starts as a draft — you can publish it later.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Property name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Anawangin Cove Hostel"
            className={inputClass}
          />
        </Field>

        <Field label="Type" required>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
            className={inputClass}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Region" required>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              placeholder="e.g. zambales"
              className={inputClass}
            />
          </Field>
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
        </div>

        <Field label="Address (optional)">
          <input
            type="text"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            maxLength={200}
            placeholder="Street, barangay, landmark"
            className={inputClass}
          />
        </Field>

        <Field label="Payment mode" required>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}
            className={inputClass}
          >
            <option value="manual">Manual (GCash / bank transfer)</option>
            <option value="stripe">Stripe (online card payments)</option>
          </select>
        </Field>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? 'Saving…' : 'Save property'}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
