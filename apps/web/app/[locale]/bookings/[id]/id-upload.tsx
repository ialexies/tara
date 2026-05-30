'use client';

import { useRef, useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function IdUpload({ bookingId, guestEmail }: { bookingId: string; guestEmail: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { uploadUrl, publicUrl } = await publicFetch<{ uploadUrl: string; publicUrl: string }>(
        `/bookings/${bookingId}/id-upload-url`,
        {
          method: 'POST',
          body: JSON.stringify({ contentType: file.type, guestEmail }),
        },
      );
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      await publicFetch(`/bookings/${bookingId}/id-document`, {
        method: 'POST',
        body: JSON.stringify({ documentUrl: publicUrl, guestEmail }),
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          ✓ ID document submitted
        </p>
        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
          The property will review it before check-in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        ID verification
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        Upload a photo of a government-issued ID (passport, driver's licence, national ID).
      </p>

      {error && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      <button
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {uploading ? 'Uploading…' : '+ Upload ID document'}
      </button>
    </div>
  );
}
