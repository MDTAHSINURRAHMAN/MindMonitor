import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
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
      where: { patientId: tentativeId, recordedAt: { gte: since } },
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
  ]);

  if (!user) redirect('/login');

  const serialised = readings.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    heartRate:  r.heartRate ?? null,
    spo2:       r.spo2      ?? null,
  }));

  const stressHigh = serialised.filter((r) => r.stressLevel === 3).length;
  const highPct    = serialised.length > 0 ? Math.round((stressHigh / serialised.length) * 100) : 0;
  const avgHr      = avg(serialised.map((r) => r.heartRate));
  const avgSpo2    = avg(serialised.map((r) => r.spo2));
  const avgTemp    = avg(serialised.map((r) => r.temperature));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sensor History</h1>
            <p className="text-sm text-gray-500 mt-1">Your recorded biometric readings over time</p>
          </div>
          <Suspense>
            <DateRangePicker value={range as DateRange} />
          </Suspense>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Readings" value={serialised.length.toString()} color="text-indigo-600" />
          <StatCard
            label="Avg Heart Rate"
            value={avgHr != null ? `${avgHr.toFixed(0)} bpm` : '—'}
            color="text-red-500"
          />
          <StatCard
            label="Avg SpO₂"
            value={avgSpo2 != null ? `${avgSpo2.toFixed(1)} %` : '—'}
            color="text-blue-500"
          />
          <StatCard
            label="High Stress"
            value={`${highPct}%`}
            color="text-orange-500"
          />
        </div>

        {/* Charts */}
        {serialised.length > 0 ? (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Stress &amp; Temperature over time
              </h2>
              <StressLineChart data={serialised} />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Heart Rate &amp; SpO₂ over time
              </h2>
              <VitalsLineChart data={serialised} />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                GSR &amp; Resistance over time
              </h2>
              <GsrLineChart data={serialised} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Stress Distribution
                </h2>
                <StressDistributionPie data={serialised} />
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col">
                <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Summary
                </h2>
                <div className="flex flex-col gap-3 text-sm">
                  <Row label="Readings in period" value={serialised.length.toString()} />
                  <Row label="Avg temperature"    value={avgTemp != null ? `${avgTemp.toFixed(1)} °C` : '—'} />
                  <Row label="Avg SpO₂"           value={avgSpo2 != null ? `${avgSpo2.toFixed(1)} %` : '—'} />
                  <Row label="Avg heart rate"      value={avgHr != null ? `${avgHr.toFixed(0)} bpm` : '—'} />
                  <Row label="High stress episodes" value={stressHigh.toString()} highlight={stressHigh > 0} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center text-sm text-gray-400">
            No sensor data found for this period. Try expanding the range or start a monitoring session.
          </div>
        )}

        {/* Readings Table */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-800">All Readings</h2>
          <ReadingsTable readings={serialised} />
        </section>

      </div>
    </main>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ? 'text-orange-500' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}
