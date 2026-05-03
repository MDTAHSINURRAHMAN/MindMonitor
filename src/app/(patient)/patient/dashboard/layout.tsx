import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { MindMonitorAI } from '@/components/dashboard/MindMonitorAI';

export default async function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) redirect('/login');

  return (
    <>
      {children}
      <MindMonitorAI patientId={session.user.id} />
    </>
  );
}
