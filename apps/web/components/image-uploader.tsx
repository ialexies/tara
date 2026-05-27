'use client';

import { useRef, useState } from 'react';

type Props = {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  label?: string;
};

export function ImageUploader({ currentUrl, onUpload, label = 'Cover photo' }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      await onUpload(file);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 transition hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
        style={{ minHeight: 160 }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Cover" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-zinc-400">
            <svg
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18"
              />
            </svg>
            <span className="text-sm">{uploading ? 'Uploading…' : 'Tap to upload photo'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="text-sm font-medium text-white">Uploading…</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
