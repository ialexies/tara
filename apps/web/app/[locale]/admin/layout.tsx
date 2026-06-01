import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { AdminSidebar, AdminBottomNav } from './admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSession();

  if (!session) redirect('/en/login');
  if (session.role !== 'admin') redirect('/en/dashboard');

  return (
    <div className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar />
      <main className="flex-1 pb-16 md:pb-0 md:pl-[220px]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</div>
      </main>
      <AdminBottomNav />
    </div>
  );
}
