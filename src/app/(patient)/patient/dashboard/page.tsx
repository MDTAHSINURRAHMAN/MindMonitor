import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

import { StressLineChart }        from '@/components/charts/StressLineChart';
import { TemperatureGauge }       from '@/components/charts/TemperatureGauge';
import { StressDistributionPie }  from '@/components/charts/StressDistributionPie';
import { LiveReadingCard }        from '@/components/dashboard/LiveReadingCard';
import { AlertBanner }            from '@/components/dashboard/AlertBanner';
import { EvaluationList }         from '@/components/dashboard/EvaluationList';
import { DateRangePicker }        from '@/components/dashboard/DateRangePicker';

const RANGE_MS: Record<string, number> = {
  '24h': 86_400_000,
  '7d':  7  * 86_400_000,
  '30d': 30 * 86_400_000,
};

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function PatientDashboardPage({ searchParams }: PageProps) {
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
  // only to obtain the user ID so we can fire DB queries immediately.
  const { data: { session } } = await supabase.auth.getSession();
  const tentativeId = session?.user?.id;
  if (!tentativeId) redirect('/login');

  /* ── Date range ── */
  const { range: rawRange } = await searchParams;
  const range = rawRange && RANGE_MS[rawRange] ? rawRange : '24h';
  const since = new Date(Date.now() - RANGE_MS[range]);

  const patientId = tentativeId;

  /* ── Parallel auth verification + data fetching ── */
  // getUser() contacts the Supabase Auth server to securely validate the token.
  // Running it alongside the DB queries means total latency = max(auth, db).
  const [{ data: { user } }, readings, alerts, evaluations] = await Promise.all([
    supabase.auth.getUser(),
    prisma.sensorReading.findMany({
      where: { patientId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: {
        id:          true,
        recordedAt:  true,
        gsrRaw:      true,
        resistance:  true,
        stressLevel: true,
        stressLabel: true,
        temperature: true,
        heartRate:   true,
        spo2:        true,
      },
    }),
    prisma.alert.findMany({
      where: { patientId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.evaluation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id:              true,
        diagnosis:       true,
        notes:           true,
        recommendations: true,
        followUpDate:    true,
        createdAt:       true,
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  if (!user) redirect('/login');

  /* ── Serialise Dates for client components ── */
  const serialisedReadings = readings.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    heartRate:  r.heartRate ?? null,
    spo2:       r.spo2 ?? null,
  }));

  const serialisedAlerts = alerts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const serialisedEvaluations = evaluations.map((e) => ({
    ...e,
    createdAt:    e.createdAt.toISOString(),
    followUpDate: e.followUpDate?.toISOString() ?? null,
  }));

  const latest = serialisedReadings.at(-1) ?? null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time mental health monitoring
            </p>
          </div>
          <Suspense>
            <DateRangePicker />
          </Suspense>
        </div>

        {/* ── Unacknowledged alerts ── */}
        {serialisedAlerts.length > 0 && (
          <AlertBanner alerts={serialisedAlerts} />
        )}

        {/* ── Live reading card ── */}
        <LiveReadingCard initialReading={latest} patientId={patientId} />

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Line chart – spans 2 cols */}
          <div className="col-span-1 lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Stress &amp; Temperature over time
            </h2>
            {serialisedReadings.length > 0 ? (
              <StressLineChart data={serialisedReadings} />
            ) : (
              <EmptyChart message="No sensor data in this period." />
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Temperature gauge */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center justify-center">
              {latest ? (
                <TemperatureGauge value={latest.temperature} />
              ) : (
                <EmptyChart message="No temperature data." />
              )}
            </div>

            {/* Stress distribution */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Stress distribution
              </h2>
              <StressDistributionPie data={serialisedReadings} />
            </div>
          </div>
        </div>

        {/* ── Evaluations ── */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            Doctor Evaluations
          </h2>
          <EvaluationList evaluations={serialisedEvaluations} />
        </section>

      </div>
    </main>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-50 items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}
