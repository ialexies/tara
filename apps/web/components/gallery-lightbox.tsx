'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

type GalleryImage = { id: string; url: string };

export function GalleryLightbox({
  coverImageUrl,
  coverAlt,
  galleryImages,
}: {
  coverImageUrl: string | null;
  coverAlt: string;
  galleryImages: GalleryImage[];
}): React.ReactElement {
  // Build the full image list: cover first, then gallery
  const allImages: GalleryImage[] = [
    ...(coverImageUrl ? [{ id: '__cover__', url: coverImageUrl }] : []),
    ...galleryImages,
  ];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const open = (index: number) => setLightboxIndex(index);
  const close = () => setLightboxIndex(null);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + allImages.length) % allImages.length));
  }, [allImages.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % allImages.length));
  }, [allImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, prev, next]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  // Touch swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  return (
    <>
      {/* Hero image */}
      <div className="mb-2 space-y-2">
        <button
          type="button"
          onClick={() => open(0)}
          className="relative block h-48 w-full overflow-hidden rounded-2xl bg-zinc-100 sm:h-64 dark:bg-zinc-800"
          aria-label="View photos"
        >
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={coverAlt}
              fill
              className="object-cover transition-opacity duration-300"
              sizes="(max-width:768px) 100vw, 768px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl">🏨</span>
            </div>
          )}
          {allImages.length > 1 && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              ⊞ {allImages.length} photos
            </span>
          )}
        </button>

        {/* Thumbnail strip */}
        {galleryImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {galleryImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => open(i + (coverImageUrl ? 1 : 0))}
                className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
                aria-label={`View photo ${i + 2}`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="112px"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={close}
          onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX;
            if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
            setTouchStartX(null);
          }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Counter */}
          <p className="absolute left-1/2 top-4 -translate-x-1/2 text-sm text-white/70">
            {lightboxIndex + 1} / {allImages.length}
          </p>

          {/* Prev */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:left-6"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div
            className="relative h-full max-h-[85dvh] w-full max-w-4xl px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={allImages[lightboxIndex]!.url}
              src={allImages[lightboxIndex]!.url}
              alt={`Photo ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Next */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 sm:right-6"
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
