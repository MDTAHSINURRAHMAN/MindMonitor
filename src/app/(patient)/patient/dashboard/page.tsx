import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { syncFirebaseReadingsForPatient } from '@/lib/firebaseReadingsSync';
import { Suspense } from 'react';
import { Activity, Heart, Droplets, Zap, TrendingUp, Brain } from 'lucide-react';

import { StressLineChart }        from '@/components/charts/StressLineChart';
import { TemperatureGauge }       from '@/components/charts/TemperatureGauge';
import { StressDistributionPie }  from '@/components/charts/StressDistributionPie';
import { VitalsLineChart }        from '@/components/charts/VitalsLineChart';
import { GsrLineChart }           from '@/components/charts/GsrLineChart';
import { MonitoringPanel }        from '@/components/dashboard/MonitoringPanel';
import { AlertBanner }            from '@/components/dashboard/AlertBanner';
import { EvaluationList }         from '@/components/dashboard/EvaluationList';
import { DateRangePicker }        from '@/components/dashboard/DateRangePicker';
import { ReadingsTable }          from '@/components/dashboard/ReadingsTable';
import { UpcomingAppointments }   from '@/components/dashboard/UpcomingAppointments';
import Link                       from 'next/link';

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

  const { data: { session } } = await supabase.auth.getSession();
  const tentativeId = session?.user?.id;
  if (!tentativeId) redirect('/login');

  /* ── Date range ── */
  const { range: rawRange } = await searchParams;
  const range = rawRange && RANGE_MS[rawRange] ? rawRange : '24h';
  const since = new Date(new Date().getTime() - RANGE_MS[range]);

  const patientId = tentativeId;

  try {
    await syncFirebaseReadingsForPatient(patientId);
  } catch {
    // Dashboard can still render existing DB data if sync fails.
  }

  /* ── Parallel data fetching ── */
  const [{ data: { user } }, readings, alerts, evaluations, activeSession, dbUser] = await Promise.all([
    supabase.auth.getUser(),
    prisma.sensorReading.findMany({
      where: { patientId, recordedAt: { gte: since }, deviceId: { not: null } },
      orderBy: { recordedAt: 'asc' },
      select: {
        id:          true,
        sessionId:   true,
        deviceId:    true,
        recordedAt:  true,
        gsrRaw:      true,
        gsrBaseline: true,
        gsrDiff:     true,
        ir:          true,
        red:         true,
        fingerDetected: true,
        skinDetected: true,
        stressScore: true,
        status:      true,
        sourceTimestampMs: true,
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
    prisma.monitoringSession.findFirst({
      where: { patientId, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: patientId },
      select: { name: true },
    }),
  ]);

  if (!user) redirect('/login');

  /* ── Serialise Dates ── */
  const serialisedReadings = readings.map((r) => {
    const sourceTimestampMs = (r as unknown as { sourceTimestampMs?: bigint | null }).sourceTimestampMs;
    return {
      ...r,
      recordedAt: r.recordedAt.toISOString(),
      heartRate:  r.heartRate ?? null,
      spo2:       r.spo2 ?? null,
      sourceTimestampMs: sourceTimestampMs != null ? sourceTimestampMs.toString() : null,
    };
  });

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

  const serialisedSession = activeSession
    ? {
        id:        activeSession.id,
        patientId: activeSession.patientId,
        deviceId:  activeSession.deviceId,
        status:    activeSession.status,
        startedAt: activeSession.startedAt.toISOString(),
      }
    : null;

  const firstName = dbUser?.name?.split(' ')[0] ?? 'Patient';

  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-125 w-125 rounded-full blur-3xl opacity-20"
        style={{ background: 'rgba(139,92,246,0.5)' }} />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-100 w-100 rounded-full blur-3xl opacity-15"
        style={{ background: 'rgba(56,189,248,0.5)' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-75 w-75 rounded-full blur-3xl opacity-10"
        style={{ background: 'rgba(244,63,94,0.5)' }} />

      {/* ── Subtle grid overlay ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
              Real-time Monitoring
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome back,{' '}
              <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className="text-sm text-white/40 mt-1">Your mental health dashboard</p>
          </div>
          <Suspense>
            <DateRangePicker />
          </Suspense>
        </div>

        {/* ── Alerts ── */}
        {serialisedAlerts.length > 0 && (
          <AlertBanner alerts={serialisedAlerts} />
        )}

        {/* ── Live monitoring panel ── */}
        <MonitoringPanel patientId={patientId} initialSession={serialisedSession} />

        {/* ── Upcoming appointments ── */}
        <UpcomingAppointments
          patientId={patientId}
          patientName={dbUser?.name ?? user?.email ?? 'Patient'}
        />

        {/* ── Latest readings summary ── */}
        {latest && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              icon={<Heart size={14} strokeWidth={2.5} />}
              label="Heart Rate"
              value={latest.heartRate != null ? `${latest.heartRate}` : '—'}
              unit={latest.heartRate != null ? 'bpm' : ''}
              color="#f43f5e"
              ringClass="ring-rose-500/30"
            />
            <MetricCard
              icon={<Droplets size={14} strokeWidth={2.5} />}
              label="SpO₂"
              value={latest.spo2 != null ? `${latest.spo2.toFixed(1)}` : '—'}
              unit={latest.spo2 != null ? '%' : ''}
              color="#38bdf8"
              ringClass="ring-sky-500/30"
            />
            <MetricCard
              icon={<Zap size={14} strokeWidth={2.5} />}
              label="GSR Raw"
              value={`${latest.gsrRaw}`}
              unit="ADC"
              color="#a855f7"
              ringClass="ring-purple-500/30"
            />
            <MetricCard
              icon={<Activity size={14} strokeWidth={2.5} />}
              label="GSR Delta"
              value={latest.gsrDiff != null ? `${latest.gsrDiff}` : '—'}
              unit={latest.gsrDiff != null ? 'ADC' : ''}
              color="#f59e0b"
              ringClass="ring-amber-500/30"
            />
          </div>
        )}

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Stress & Temperature — spans 2 cols */}
          <GlassCard title="Stress & Temperature" titleIcon={<Brain size={14} />} className="lg:col-span-2">
            {serialisedReadings.length > 0 ? (
              <StressLineChart data={serialisedReadings} />
            ) : (
              <EmptyChart message="No sensor data in this period." />
            )}
          </GlassCard>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <GlassCard title="Body Temperature" titleIcon={<Activity size={14} />}>
              {latest ? (
                <TemperatureGauge value={latest.temperature} />
              ) : (
                <EmptyChart message="No temperature data." />
              )}
            </GlassCard>

            <GlassCard title="Stress Distribution" titleIcon={<TrendingUp size={14} />}>
              <StressDistributionPie data={serialisedReadings} />
            </GlassCard>
          </div>
        </div>

        <GlassCard title="Heart Rate & SpO₂" titleIcon={<Heart size={14} />}>
          <VitalsLineChart data={serialisedReadings} />
        </GlassCard>

        <GlassCard title="GSR Raw & GSR Delta" titleIcon={<Zap size={14} />}>
          <GsrLineChart data={serialisedReadings} />
        </GlassCard>

        {/* ── Recent Readings Table ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Recent Readings</h2>
            <Link
              href="/patient/dashboard/history"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              View full history →
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/8 bg-white/4 backdrop-blur-md">
            <ReadingsTable readings={serialisedReadings} pageSize={10} />
          </div>
        </section>

        {/* ── Evaluations ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
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
    <div className="flex h-50 items-center justify-center text-sm text-white/30">
      {message}
    </div>
  );
}

function GlassCard({
  title,
  titleIcon,
  children,
  className = '',
}: {
  title: string;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        {titleIcon && <span className="text-white/40">{titleIcon}</span>}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  color,
  ringClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
  ringClass: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md ring-1 ${ringClass}`}>
      <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full blur-2xl opacity-25"
        style={{ background: color }} />
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-white">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-white/30">{unit}</span>}
      </p>
    </div>
  );
}
