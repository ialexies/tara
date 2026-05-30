import { PropertyCardSkeleton } from '@/components/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 h-10 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
