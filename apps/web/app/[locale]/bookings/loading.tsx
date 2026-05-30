import { BookingCardSkeleton } from '@/components/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 h-7 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
