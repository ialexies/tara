import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSession();

  if (!session) {
    redirect('/en/login');
  }

  if (session.role !== 'owner' && session.role !== 'admin') {
    redirect('/en');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="pt-safe sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <a
            href="/en"
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Tara
          </a>
          <span className="text-xs text-zinc-400">Owner Dashboard</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
