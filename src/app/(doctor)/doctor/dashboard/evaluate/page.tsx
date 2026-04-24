import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { EvaluatePageClient } from '@/components/dashboard/EvaluatePageClient';

interface PageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function EvaluatePage({ searchParams }: PageProps) {
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
  const tentativeEmail = session?.user?.email;
  if (!tentativeEmail) redirect('/login');

  const [{ data: { user } }, doctor] = await Promise.all([
    supabase.auth.getUser(),
    prisma.user.findUnique({
      where: { email: tentativeEmail },
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!user || !doctor || doctor.role !== 'DOCTOR') redirect('/login');

  const assignments = await prisma.patientDoctor.findMany({
    where: { doctorId: doctor.id },
    include: {
      patient: { select: { id: true, name: true, email: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });

  const patients = assignments.map((a) => a.patient);
  const { patientId: preselectedId } = await searchParams;

  return (
    <EvaluatePageClient
      doctorId={doctor.id}
      doctorName={doctor.name}
      patients={patients}
      preselectedPatientId={preselectedId ?? null}
    />
  );
}
