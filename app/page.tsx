import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import DashboardClient from '@/app/components/DashboardClient';
import { getSession, getUserPermissions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch permissions from database (real-time)
  const permissions = await getUserPermissions(session.user);

  const allPermits = await db.select().from(permits).orderBy(desc(permits.createdAt));

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <DashboardClient permits={allPermits} userRole={session.role || 'user'} permissions={permissions} />
    </div>
  );
}
