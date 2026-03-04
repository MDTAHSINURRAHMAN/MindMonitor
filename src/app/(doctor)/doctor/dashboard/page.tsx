import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { DoctorDashboardClient } from './DoctorDashboardClient';

export default async function DoctorDashboardPage() {
  /* ── Auth ── */
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  // getSession() reads the JWT from the cookie locally (no network) — use it
  // only to obtain the email so we can fire the DB query immediately.
  // NOTE: Prisma Users are keyed by email (cuid id ≠ Supabase UUID), so we
  // must look up by email, not by session.user.id.
  const { data: { session } } = await supabase.auth.getSession();
  const tentativeEmail = session?.user?.email;
  if (!tentativeEmail) redirect('/login');

  // Run the secure server-side auth check (getUser) and the DB lookup in
  // parallel — total latency = max(auth, db) instead of auth + db.
  const [{ data: { user } }, doctor] = await Promise.all([
    supabase.auth.getUser(),
    prisma.user.findUnique({
      where: { email: tentativeEmail },
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!user) redirect('/login');
  if (!doctor || doctor.role !== 'DOCTOR') redirect('/login');

  return (
    <DoctorDashboardClient
      doctorId={doctor.id}
      doctorName={doctor.name}
    />
  );
}

