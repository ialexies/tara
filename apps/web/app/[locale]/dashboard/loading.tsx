import { TableRowSkeleton } from '@/components/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 h-7 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={5} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
