import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import { Activity, Heart, Droplets, TrendingUp, Brain, Zap } from 'lucide-react';

import { StressLineChart }       from '@/components/charts/StressLineChart';
import { VitalsLineChart }       from '@/components/charts/VitalsLineChart';
import { GsrLineChart }          from '@/components/charts/GsrLineChart';
import { StressDistributionPie } from '@/components/charts/StressDistributionPie';
import { DateRangePicker }       from '@/components/dashboard/DateRangePicker';
import type { DateRange }        from '@/components/dashboard/DateRangePicker';
import { ReadingsTable }         from '@/components/dashboard/ReadingsTable';

const RANGE_MS: Record<string, number> = {
  '24h': 86_400_000,
  '7d':  7  * 86_400_000,
  '30d': 30 * 86_400_000,
};

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

function avg(arr: (number | null | undefined)[]): number | null {
  const vals = arr.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export default async function PatientHistoryPage({ searchParams }: PageProps) {
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

  const { range: rawRange } = await searchParams;
  const range = rawRange && RANGE_MS[rawRange] ? rawRange : '7d';
  const since = new Date(Date.now() - RANGE_MS[range]);

  const [{ data: { user } }, readings] = await Promise.all([
    supabase.auth.getUser(),
    prisma.sensorReading.findMany({
      where: { patientId: tentativeId, recordedAt: { gte: since }, deviceId: { not: null } },
      orderBy: { recordedAt: 'asc' },
      select: {
        id:          true,
        sessionId:   true,
        deviceId:    true,
        recordedAt:  true,
        gsrRaw:      true,
        gsrDiff:     true,
        fingerDetected: true,
        skinDetected: true,
        stressScore: true,
        status:      true,
        stressLevel: true,
        stressLabel: true,
        temperature: true,
        heartRate:   true,
        spo2:        true,
      },
    }),
  ]);

  if (!user) redirect('/login');

  const serialised = readings.map((r) => ({
    ...r,
    recordedAt:        r.recordedAt.toISOString(),
    heartRate:         r.heartRate ?? null,
    spo2:              r.spo2 ?? null,
    sourceTimestampMs: null,
  }));

  const stressHigh = serialised.filter((r) => r.stressLevel === 3).length;
  const highPct    = serialised.length > 0 ? Math.round((stressHigh / serialised.length) * 100) : 0;
  const avgHr      = avg(serialised.map((r) => r.heartRate));
  const avgSpo2    = avg(serialised.map((r) => r.spo2));
  const avgTemp    = avg(serialised.map((r) => r.temperature));

  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-125 w-125 rounded-full blur-3xl opacity-20"
        style={{ background: 'rgba(56,189,248,0.5)' }} />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-100 w-100 rounded-full blur-3xl opacity-15"
        style={{ background: 'rgba(139,92,246,0.5)' }} />

      {/* ── Grid overlay ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 backdrop-blur-sm">
              <TrendingUp size={10} />
              Sensor History
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Biometric{' '}
              <span className="bg-linear-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                Timeline
              </span>
            </h1>
            <p className="text-sm text-white/40 mt-1">Your recorded readings over time</p>
          </div>
          <Suspense>
            <DateRangePicker value={range as DateRange} />
          </Suspense>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Activity size={14} strokeWidth={2.5} />}
            label="Total Readings"
            value={serialised.length.toString()}
            unit=""
            color="#a855f7"
            ringClass="ring-purple-500/30"
          />
          <StatCard
            icon={<Heart size={14} strokeWidth={2.5} />}
            label="Avg Heart Rate"
            value={avgHr != null ? avgHr.toFixed(0) : '—'}
            unit={avgHr != null ? 'bpm' : ''}
            color="#f43f5e"
            ringClass="ring-rose-500/30"
          />
          <StatCard
            icon={<Droplets size={14} strokeWidth={2.5} />}
            label="Avg SpO₂"
            value={avgSpo2 != null ? avgSpo2.toFixed(1) : '—'}
            unit={avgSpo2 != null ? '%' : ''}
            color="#38bdf8"
            ringClass="ring-sky-500/30"
          />
          <StatCard
            icon={<Brain size={14} strokeWidth={2.5} />}
            label="High Stress"
            value={`${highPct}%`}
            unit=""
            color={highPct > 50 ? '#f43f5e' : highPct > 20 ? '#f97316' : '#22c55e'}
            ringClass={highPct > 50 ? 'ring-rose-500/30' : highPct > 20 ? 'ring-orange-500/30' : 'ring-emerald-500/30'}
          />
        </div>

        {/* ── Charts ── */}
        {serialised.length > 0 ? (
          <>
            <GlassCard title="Stress & Temperature" titleIcon={<Brain size={14} />}>
              <StressLineChart data={serialised} />
            </GlassCard>

            <GlassCard title="Heart Rate & SpO₂" titleIcon={<Heart size={14} />}>
              <VitalsLineChart data={serialised} />
            </GlassCard>

            <GlassCard title="GSR Raw & GSR Delta" titleIcon={<Zap size={14} />}>
              <GsrLineChart data={serialised} />
            </GlassCard>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <GlassCard title="Stress Distribution" titleIcon={<TrendingUp size={14} />}>
                <StressDistributionPie data={serialised} />
              </GlassCard>

              <GlassCard title="Period Summary" titleIcon={<Activity size={14} />}>
                <div className="flex flex-col gap-2.5 text-sm">
                  <SummaryRow label="Readings in period" value={serialised.length.toString()} />
                  <SummaryRow label="Avg temperature"    value={avgTemp != null ? `${avgTemp.toFixed(1)} °C` : '—'} />
                  <SummaryRow label="Avg SpO₂"           value={avgSpo2 != null ? `${avgSpo2.toFixed(1)} %` : '—'} />
                  <SummaryRow label="Avg heart rate"     value={avgHr != null ? `${avgHr.toFixed(0)} bpm` : '—'} />
                  <SummaryRow label="High stress episodes" value={stressHigh.toString()} highlight={stressHigh > 0} />
                </div>
              </GlassCard>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center text-sm text-white/30 backdrop-blur-md">
            No sensor data found for this period. Try expanding the range or start a monitoring session.
          </div>
        )}

        {/* ── Readings Table ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">All Readings</h2>
          <div className="rounded-2xl overflow-hidden border border-white/8 bg-white/4 backdrop-blur-md">
            <ReadingsTable readings={serialised} />
          </div>
        </section>

      </div>
    </main>
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

function StatCard({
  icon, label, value, unit, color, ringClass,
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

function SummaryRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/6 last:border-0">
      <span className="text-white/50">{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ? 'text-orange-400' : 'text-white/80'}`}>
        {value}
      </span>
    </div>
  );
}
