'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw, TrendingUp, ClipboardList,
  Activity, Thermometer, Heart, Zap, Table2,
  PlusCircle, Clock, Video, X, PhoneCall, CalendarPlus, Calendar,
  Loader2, FileText,
} from 'lucide-react';
import Link from 'next/link';

import { LiveReadingCard }       from './LiveReadingCard';
import { EvaluationList }        from './EvaluationList';
import { EvaluationForm }        from './EvaluationForm';
import { ReadingsTable }         from './ReadingsTable';
import { AppointmentScheduler }  from './AppointmentScheduler';
import { VideoCallRoom }         from './VideoCallRoom';
import type { PatientSummary }   from './PatientListSidebar';
import type { EvaluationItem }   from './EvaluationList';
import type { SensorReading }    from './LiveReadingCard';
import type { Appointment }      from './AppointmentScheduler';

import { StressLineChart }       from '@/components/charts/StressLineChart';
import { TemperatureGauge }      from '@/components/charts/TemperatureGauge';
import { StressDistributionPie } from '@/components/charts/StressDistributionPie';
import { VitalsLineChart }       from '@/components/charts/VitalsLineChart';
import { GsrLineChart }          from '@/components/charts/GsrLineChart';

interface Props {
  patient: PatientSummary;
  doctorId: string;
}

type RangeKey = '24h' | '7d' | '30d';
const RANGES: RangeKey[] = ['24h', '7d', '30d'];
const RANGE_LABELS: Record<RangeKey, string> = { '24h': '24h', '7d': '7 days', '30d': '30 days' };

type ActiveTab = 'history' | 'readings' | 'new' | 'appointments';
type ClinicalStatus = 'normal' | 'warn' | 'danger';

function avg(arr: (number | null | undefined)[]): number | null {
  const vals = arr.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function hrStatus(hr: number | null): ClinicalStatus {
  if (hr == null) return 'normal';
  if (hr > 120 || hr < 50) return 'danger';
  if (hr > 100 || hr < 60) return 'warn';
  return 'normal';
}

function spo2Status(spo2: number | null): ClinicalStatus {
  if (spo2 == null) return 'normal';
  if (spo2 < 90) return 'danger';
  if (spo2 < 94) return 'warn';
  return 'normal';
}

function tempStatus(temp: number | null): ClinicalStatus {
  if (temp == null) return 'normal';
  if (temp > 38.5 || temp < 35.5) return 'danger';
  if (temp > 37.5 || temp < 36.0) return 'warn';
  return 'normal';
}

function stressPctStatus(pct: number): ClinicalStatus {
  if (pct > 50) return 'danger';
  if (pct > 20) return 'warn';
  return 'normal';
}

const STATUS_CARD: Record<ClinicalStatus, { border: string; iconBg: string; valueColor: string; sub: string }> = {
  normal: { border: 'border-white/10',   iconBg: 'bg-white/5',        valueColor: 'text-white/90',   sub: '' },
  warn:   { border: 'border-amber-500/30', iconBg: 'bg-amber-500/10', valueColor: 'text-amber-400',  sub: 'Borderline' },
  danger: { border: 'border-rose-500/30', iconBg: 'bg-rose-500/10',   valueColor: 'text-rose-400',   sub: 'Attention needed' },
};

const STRESS_RING: Record<number, string> = {
  1: 'ring-emerald-500/40',
  2: 'ring-amber-400/40',
  3: 'ring-rose-500/50',
};

const RISK_BADGE: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Low Risk'      },
  2: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   label: 'Moderate Risk' },
  3: { bg: 'bg-rose-500/15',    text: 'text-rose-400',    label: 'High Risk'     },
};

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  status = 'normal',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  status?: ClinicalStatus;
}) {
  const s = STATUS_CARD[status];
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${s.border} bg-white/5 backdrop-blur-md p-4`}>
      <div className={`mt-0.5 rounded-lg p-2 ${s.iconBg} shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-white/40 mb-0.5">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${s.valueColor}`}>
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-white/30">{unit}</span>}
        </p>
        {(sub ?? s.sub) && (
          <p className={`text-xs mt-0.5 ${status !== 'normal' ? s.valueColor : 'text-white/30'}`}>
            {sub ?? s.sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/35">{title}</h3>
      {children}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const secs = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

async function patchAppointment(id: string, status: string): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status }),
  });
  return res.json();
}

export function PatientDetailPanel({ patient, doctorId }: Props) {
  const [range, setRange]                     = useState<RangeKey>('24h');
  const [readings, setReadings]               = useState<SensorReading[]>([]);
  const [evaluations, setEvaluations]         = useState<EvaluationItem[]>([]);
  const [upcomingAppts, setUpcomingAppts]     = useState<Appointment[]>([]);
  const [historyAppts,  setHistoryAppts]      = useState<Appointment[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(true);
  const [loadingEvals, setLoadingEvals]       = useState(true);
  const [loadingAppts, setLoadingAppts]       = useState(true);
  const [activeTab, setActiveTab]             = useState<ActiveTab>('history');
  const [showScheduler, setShowScheduler]     = useState(false);
  const [activeCall, setActiveCall]           = useState<Appointment | null>(null);
  const [instantCallLoading, setInstantCallLoading] = useState(false);

  async function handleInstantCall() {
    setInstantCallLoading(true);
    try {
      const createRes = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          scheduledAt: new Date().toISOString(),
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create call');
      const appt: Appointment = await createRes.json();
      const updated = await patchAppointment(appt.id, 'ACTIVE');
      setActiveCall(updated);
    } catch {
      // silent
    } finally {
      setInstantCallLoading(false);
    }
  }

  const fetchReadings = useCallback(async () => {
    setLoadingReadings(true);
    try {
      const res = await fetch(`/api/readings?patientId=${patient.id}&range=${range}`, { cache: 'no-store' });
      if (res.ok) setReadings(await res.json());
    } finally {
      setLoadingReadings(false);
    }
  }, [patient.id, range]);

  const fetchEvals = useCallback(async () => {
    setLoadingEvals(true);
    try {
      const res = await fetch(`/api/evaluations?patientId=${patient.id}`, { cache: 'no-store' });
      if (res.ok) setEvaluations(await res.json());
    } finally {
      setLoadingEvals(false);
    }
  }, [patient.id]);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const [upRes, histRes] = await Promise.all([
        fetch(`/api/appointments?patientId=${patient.id}&status=SCHEDULED,ACTIVE`, { cache: 'no-store' }),
        fetch(`/api/appointments?patientId=${patient.id}&status=COMPLETED,CANCELLED`, { cache: 'no-store' }),
      ]);
      if (upRes.ok)   setUpcomingAppts(await upRes.json());
      if (histRes.ok) setHistoryAppts((await histRes.json()).reverse());
    } finally {
      setLoadingAppts(false);
    }
  }, [patient.id]);

  useEffect(() => { fetchReadings(); },     [fetchReadings]);
  useEffect(() => { fetchEvals(); },        [fetchEvals]);
  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  const stats = useMemo(() => {
    if (readings.length === 0) return null;
    const highStress = readings.filter((r) => r.stressLevel === 3).length;
    return {
      total:         readings.length,
      avgHr:         avg(readings.map((r) => r.heartRate)),
      avgSpo2:       avg(readings.map((r) => r.spo2)),
      avgTemp:       avg(readings.map((r) => r.temperature)),
      highStressPct: Math.round((highStress / readings.length) * 100),
    };
  }, [readings]);

  const stressLevel = patient.latestStressLevel ?? 0;
  const riskBadge   = stressLevel > 0 ? RISK_BADGE[stressLevel] : null;
  const ringClass   = stressLevel > 0 ? STRESS_RING[stressLevel] : 'ring-gray-200';

  const TABS: { key: ActiveTab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'history',      icon: <ClipboardList className="h-3.5 w-3.5" />, label: 'Evaluations',   count: evaluations.length   },
    { key: 'readings',     icon: <Table2        className="h-3.5 w-3.5" />, label: 'Readings Log',  count: readings.length      },
    { key: 'appointments', icon: <Calendar      className="h-3.5 w-3.5" />, label: 'Appointments',  count: upcomingAppts.length },
    { key: 'new',          icon: <PlusCircle    className="h-3.5 w-3.5" />, label: 'New Evaluation'                              },
  ];

  return (
    <>
    {/* ─── Full-screen video call overlay ─── */}
    {activeCall && (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
          <div className="flex items-center gap-2 text-white">
            <Video className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-medium">
              Video call with {patient.name}
            </span>
          </div>
          <button
            onClick={async () => {
              await patchAppointment(activeCall.id, 'COMPLETED');
              setActiveCall(null);
              fetchAppointments();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            End Call
          </button>
        </div>
        <div className="flex-1">
          <VideoCallRoom
            roomId={activeCall.roomId}
            userId={doctorId}
            userName="Doctor"
            onLeave={async () => {
              await patchAppointment(activeCall.id, 'COMPLETED');
              setActiveCall(null);
              fetchAppointments();
            }}
          />
        </div>
      </div>
    )}

    {/* ─── Scheduler modal ─── */}
    {showScheduler && (
      <AppointmentScheduler
        patientId={patient.id}
        patientName={patient.name}
        doctorId={doctorId}
        onScheduled={(appt) => {
          setUpcomingAppts((prev) => [...prev, appt]);
          setShowScheduler(false);
          setActiveTab('appointments');
        }}
        onClose={() => setShowScheduler(false)}
      />
    )}

    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-gray-950 p-6 gap-5">

      {/* ─── Patient Hero ─── */}
      <div className="relative overflow-hidden flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
        {/* glow behind avatar */}
        <div className={`pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full blur-3xl opacity-20 ${
          stressLevel === 3 ? 'bg-rose-500' : stressLevel === 2 ? 'bg-amber-400' : stressLevel === 1 ? 'bg-emerald-500' : 'bg-violet-500'
        }`} />

        {/* Avatar */}
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-2 ${ringClass} text-xl font-bold border ${
          stressLevel === 3 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'    :
          stressLevel === 2 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
          stressLevel === 1 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                              'bg-violet-500/20 text-violet-300 border-violet-500/30'
        }`}>
          {patient.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white truncate">{patient.name}</h2>
            {riskBadge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/10 ${riskBadge.bg} ${riskBadge.text}`}>
                {stressLevel === 3 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                {riskBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-white/35 truncate">{patient.email}</p>
          {patient.latestReadingAt && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/30">
              <Clock className="h-3 w-3" />
              Last reading {timeAgo(patient.latestReadingAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0 relative">
          <button
            onClick={handleInstantCall}
            disabled={instantCallLoading}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors shadow-lg shadow-emerald-900/40"
          >
            {instantCallLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <PhoneCall className="h-3.5 w-3.5" />
            }
            {instantCallLoading ? 'Connecting…' : 'Start Call Now'}
          </button>
          <button
            onClick={() => setShowScheduler(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/40"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule Call
          </button>
          <Link
            href={`/doctor/dashboard/evaluate?patientId=${patient.id}`}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/12 hover:text-white transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Write Evaluation
          </Link>
        </div>
      </div>

      {/* ─── Live Reading ─── */}
      <LiveReadingCard patientId={patient.id} initialReading={latest} />

      {/* ─── Stat Cards ─── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Heart className="h-4 w-4 text-red-500" />}
            label="Avg Heart Rate"
            value={stats.avgHr != null ? stats.avgHr.toFixed(0) : '—'}
            unit={stats.avgHr != null ? 'bpm' : undefined}
            sub={`over ${stats.total} readings`}
            status={hrStatus(stats.avgHr)}
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            label="Avg SpO₂"
            value={stats.avgSpo2 != null ? stats.avgSpo2.toFixed(1) : '—'}
            unit={stats.avgSpo2 != null ? '%' : undefined}
            status={spo2Status(stats.avgSpo2)}
          />
          <StatCard
            icon={<Thermometer className="h-4 w-4 text-orange-500" />}
            label="Avg Temperature"
            value={stats.avgTemp != null ? stats.avgTemp.toFixed(1) : '—'}
            unit={stats.avgTemp != null ? '°C' : undefined}
            status={tempStatus(stats.avgTemp)}
          />
          <StatCard
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
            label="High Stress"
            value={`${stats.highStressPct}%`}
            sub="of all readings"
            status={stressPctStatus(stats.highStressPct)}
          />
        </div>
      )}

      {/* ─── Range picker ─── */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-white/25 shrink-0" />
        <span className="text-xs font-medium text-white/35 mr-0.5">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 ${
              range === r
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 border border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
        {stats && (
          <span className="ml-1 text-xs text-white/25">{stats.total} pts</span>
        )}
        <button
          onClick={fetchReadings}
          className="ml-auto rounded-lg p-1.5 text-white/25 hover:bg-white/5 hover:text-white/50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingReadings ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ─── Charts ─── */}
      {loadingReadings ? (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading readings…</span>
        </div>
      ) : readings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Stress & Temperature — full width */}
          <ChartCard title="Stress &amp; Temperature" className="lg:col-span-2">
            <StressLineChart data={readings} />
          </ChartCard>

          {/* Vitals + GSR side by side */}
          <ChartCard title="Heart Rate &amp; SpO₂">
            <VitalsLineChart
              data={readings.map((r) => ({ ...r, heartRate: r.heartRate ?? null, spo2: r.spo2 ?? null }))}
            />
          </ChartCard>

          <ChartCard title="GSR &amp; Resistance">
            <GsrLineChart data={readings} />
          </ChartCard>

          {/* Pie + Gauge side by side */}
          <ChartCard title="Stress Distribution">
            <StressDistributionPie data={readings} />
          </ChartCard>

          <ChartCard title="Current Temperature">
            {latest?.temperature != null ? (
              <div className="flex items-center justify-center">
                <TemperatureGauge value={latest.temperature} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">No data</div>
            )}
          </ChartCard>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-10 text-center backdrop-blur-md">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-white/15" />
          <p className="text-sm text-white/30">No readings available for this range.</p>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <div className="flex border-b border-white/8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'border-b-2 border-violet-500 text-violet-300'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-violet-500/20 text-violet-300' : 'bg-white/8 text-white/40'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'history' && (
            loadingEvals ? (
              <div className="flex items-center gap-2 text-sm text-white/30">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : evaluations.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-white/15" />
                <p className="text-sm text-white/30">No evaluations yet.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Add the first evaluation →
                </button>
              </div>
            ) : (
              <EvaluationList evaluations={evaluations} patientName={patient.name} />
            )
          )}

          {activeTab === 'readings' && (
            <ReadingsTable readings={readings} />
          )}

          {activeTab === 'appointments' && (
            loadingAppts ? (
              <div className="flex items-center gap-2 text-sm text-white/30">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Upcoming / active ── */}
                {upcomingAppts.length === 0 ? (
                  <div className="py-6 text-center">
                    <Video className="h-8 w-8 mx-auto mb-2 text-white/15" />
                    <p className="text-sm text-white/30">No upcoming appointments.</p>
                    <button onClick={() => setShowScheduler(true)} className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                      Schedule a video call →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppts.map((appt) => (
                      <div
                        key={appt.id}
                        className={`flex items-center justify-between rounded-xl border p-4 ${
                          appt.status === 'ACTIVE'
                            ? 'border-emerald-500/30 bg-emerald-500/8'
                            : 'border-violet-500/20 bg-violet-500/8'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white/80">
                              {formatDateTime(appt.scheduledAt)}
                            </p>
                            {appt.status === 'ACTIVE' && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-bold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/30 mt-0.5">
                            Room: <span className="font-mono">{appt.roomId.slice(0, 10)}…</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const updated = await patchAppointment(appt.id, 'ACTIVE');
                              setActiveCall(updated);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            {appt.status === 'ACTIVE' ? 'Rejoin' : 'Start Call'}
                          </button>
                          {appt.status !== 'ACTIVE' && (
                            <button
                              onClick={async () => {
                                await patchAppointment(appt.id, 'CANCELLED');
                                fetchAppointments();
                              }}
                              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/40 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/25 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowScheduler(true)}
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Schedule another call
                    </button>
                  </div>
                )}

                {/* ── History ── */}
                {historyAppts.length > 0 && (
                  <div className="border-t border-white/8 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">
                      Call History
                    </p>
                    <div className="space-y-2">
                      {historyAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-1.5 ${appt.status === 'COMPLETED' ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
                              {appt.status === 'COMPLETED'
                                ? <Video className="h-4 w-4 text-emerald-400" />
                                : <X     className="h-4 w-4 text-white/25" />
                              }
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white/70">
                                {formatDateTime(appt.scheduledAt)}
                              </p>
                              {appt.startedAt && appt.endedAt && (
                                <p className="text-xs text-white/30">
                                  Duration: <span className="text-emerald-400 font-medium">{formatDuration(appt.startedAt, appt.endedAt)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-white/5 ${
                            appt.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-white/5 text-white/30'
                          }`}>
                            {appt.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'new' && (
            <EvaluationForm
              patientId={patient.id}
              doctorId={doctorId}
              onSubmitted={() => {
                fetchEvals();
                setActiveTab('history');
              }}
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}
