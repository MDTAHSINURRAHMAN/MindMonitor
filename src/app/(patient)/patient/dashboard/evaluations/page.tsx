import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { EvaluationsPageClient } from '@/components/dashboard/EvaluationsPageClient';

export default async function PatientEvaluationsPage() {
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) redirect('/login');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const patientId = session.user.id;

  const [evaluations, dbUser] = await Promise.all([
    prisma.evaluation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:              true,
        diagnosis:       true,
        notes:           true,
        recommendations: true,
        followUpDate:    true,
        createdAt:       true,
        doctor: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: patientId },
      select: { name: true },
    }),
  ]);

  const serialisedEvaluations = evaluations.map((e) => ({
    ...e,
    createdAt:    e.createdAt.toISOString(),
    followUpDate: e.followUpDate?.toISOString() ?? null,
  }));

  return (
    <EvaluationsPageClient
      evaluations={serialisedEvaluations}
      patientName={dbUser?.name ?? user.email ?? 'Patient'}
    />
  );
}
