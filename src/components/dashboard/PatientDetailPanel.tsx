'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  RefreshCw, TrendingUp, ClipboardList,
  Activity, Thermometer, Heart, Zap, Table2,
  PlusCircle, Clock, Video, X, PhoneCall, CalendarPlus, Calendar,
} from 'lucide-react';

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
  normal: { border: 'border-gray-100',    iconBg: 'bg-gray-50',   valueColor: 'text-gray-800',   sub: '' },
  warn:   { border: 'border-orange-200',  iconBg: 'bg-orange-50', valueColor: 'text-orange-700', sub: 'Borderline' },
  danger: { border: 'border-red-200',     iconBg: 'bg-red-50',    valueColor: 'text-red-700',    sub: 'Attention needed' },
};

const STRESS_RING: Record<number, string> = {
  1: 'ring-green-400',
  2: 'ring-orange-400',
  3: 'ring-red-500',
};

const RISK_BADGE: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Low Risk'      },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Moderate Risk' },
  3: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'High Risk'     },
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
    <div className={`flex items-start gap-3 rounded-xl border ${s.border} bg-white p-4 shadow-sm`}>
      <div className={`mt-0.5 rounded-lg p-2 ${s.iconBg} shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${s.valueColor}`}>
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>}
        </p>
        {(sub ?? s.sub) && (
          <p className={`text-xs mt-0.5 ${status !== 'normal' ? s.valueColor : 'text-gray-400'}`}>
            {sub ?? s.sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
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

    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-gray-50 p-6 gap-5">

      {/* ─── Patient Hero ─── */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {/* Avatar with stress-level ring */}
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ${ringClass} text-xl font-bold ${
          stressLevel === 3 ? 'bg-red-100 text-red-700'    :
          stressLevel === 2 ? 'bg-orange-100 text-orange-700' :
          stressLevel === 1 ? 'bg-green-100 text-green-700' :
                              'bg-indigo-100 text-indigo-600'
        }`}>
          {patient.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800 truncate">{patient.name}</h2>
            {riskBadge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadge.bg} ${riskBadge.text}`}>
                {stressLevel === 3 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                {riskBadge.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">{patient.email}</p>
          {patient.latestReadingAt && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              Last reading {timeAgo(patient.latestReadingAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {stats && (
            <div className="hidden sm:flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-gray-400">{stats.total} readings</span>
              <span className={`text-xs font-semibold ${stressPctStatus(stats.highStressPct) === 'danger' ? 'text-red-600' : stressPctStatus(stats.highStressPct) === 'warn' ? 'text-orange-600' : 'text-gray-500'}`}>
                {stats.highStressPct}% high stress
              </span>
            </div>
          )}
          <button
            onClick={() => setShowScheduler(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Schedule Call
          </button>
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
        <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-xs font-medium text-gray-500 mr-0.5">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              range === r
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
        {stats && (
          <span className="ml-1 text-xs text-gray-400">{stats.total} pts</span>
        )}
        <button
          onClick={fetchReadings}
          className="ml-auto rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
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
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No readings available for this range.</p>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
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
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : evaluations.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No evaluations yet.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="mt-3 text-xs text-indigo-600 hover:underline"
                >
                  Add the first evaluation →
                </button>
              </div>
            ) : (
              <EvaluationList evaluations={evaluations} />
            )
          )}

          {activeTab === 'readings' && (
            <ReadingsTable readings={readings} />
          )}

          {activeTab === 'appointments' && (
            loadingAppts ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Upcoming / active ── */}
                {upcomingAppts.length === 0 ? (
                  <div className="py-6 text-center">
                    <Video className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">No upcoming appointments.</p>
                    <button onClick={() => setShowScheduler(true)} className="mt-2 text-xs text-indigo-600 hover:underline">
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
                            ? 'border-green-200 bg-green-50'
                            : 'border-indigo-100 bg-indigo-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">
                              {formatDateTime(appt.scheduledAt)}
                            </p>
                            {appt.status === 'ACTIVE' && (
                              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Room: <span className="font-mono">{appt.roomId.slice(0, 10)}…</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const updated = await patchAppointment(appt.id, 'ACTIVE');
                              setActiveCall(updated);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
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
                              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowScheduler(true)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Schedule another call
                    </button>
                  </div>
                )}

                {/* ── History ── */}
                {historyAppts.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Call History
                    </p>
                    <div className="space-y-2">
                      {historyAppts.map((appt) => (
                        <div
                          key={appt.id}
                          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-1.5 ${appt.status === 'COMPLETED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                              {appt.status === 'COMPLETED'
                                ? <Video className="h-4 w-4 text-green-600" />
                                : <X     className="h-4 w-4 text-gray-400" />
                              }
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {formatDateTime(appt.scheduledAt)}
                              </p>
                              {appt.startedAt && appt.endedAt && (
                                <p className="text-xs text-gray-400">
                                  Duration: <span className="text-green-600 font-medium">{formatDuration(appt.startedAt, appt.endedAt)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            appt.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
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
