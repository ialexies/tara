'use client';

/**
 * Philippine phone input — shows +63 prefix, formats digits as user types.
 * Accepts local (09171234567), international (+639171234567), or partial input.
 * Always stores the full E.164 value (+639171234567) in onChange.
 */

type PhoneInputProps = {
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

// Strip country prefix and return the local digits only (without leading 0)
function toLocal(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.startsWith('63')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// Format local digits into readable chunks: 917 123 4567
function formatLocal(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// Convert display value back to E.164
function toE164(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (!digits) return '';
  return `+63${digits}`;
}

export function PhoneInput({ value, onChange, required, placeholder, className }: PhoneInputProps) {
  const local = toLocal(value);
  const display = local ? formatLocal(local) : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Strip non-digits, re-format, store E.164
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    onChange(toE164(digits));
  }

  const base =
    'flex-1 rounded-r-lg border border-l-0 border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600';

  return (
    <div className={`flex ${className ?? ''}`}>
      {/* Country prefix badge */}
      <span className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        🇵🇭 +63
      </span>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9 ]*"
        value={display}
        onChange={handleChange}
        required={required}
        placeholder={placeholder ?? '917 123 4567'}
        className={base}
      />
    </div>
  );
}
