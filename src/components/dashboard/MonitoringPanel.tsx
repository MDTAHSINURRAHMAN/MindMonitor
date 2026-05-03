'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, Thermometer, Zap, Heart, Wind,
  Play, Square, Wifi, WifiOff, FingerprintPattern,
  Clock, BarChart2,
} from 'lucide-react';
import { useSessionStream } from '@/hooks/useSessionStream';
import type { LiveReading } from '@/lib/fakeReading';

/* ─── types ─────────────────────────────────────────────────────────────── */

interface ActiveSession {
  id: string;
  patientId: string;
  deviceId: string | null;
  status: string;
  startedAt: string;
}

interface Props {
  patientId: string;
  initialSession: ActiveSession | null;
}

/* ─── styling maps ───────────────────────────────────────────────────────── */

const STATUS_CFG = {
  normal:   { badge: 'bg-green-100 text-green-700 ring-green-300',   dot: 'bg-green-500',  label: 'Normal'   },
  elevated: { badge: 'bg-orange-100 text-orange-700 ring-orange-300', dot: 'bg-orange-400', label: 'Elevated' },
  high:     { badge: 'bg-red-100 text-red-700 ring-red-300',          dot: 'bg-red-500 animate-pulse', label: 'High Stress' },
} as const;

/* ─── small reusable pieces ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: LiveReading['status'] }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.normal;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${cfg.badge}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-green-500' : 'bg-gray-300'}`} />
      {label}
    </span>
  );
}

function StatCard({
  icon, label, value, unit,
  size = 'md',
  highlight = 'none',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  size?: 'lg' | 'md';
  highlight?: 'none' | 'warn' | 'danger';
}) {
  const bg =
    highlight === 'danger' ? 'bg-red-50 ring-1 ring-red-200'
    : highlight === 'warn' ? 'bg-orange-50 ring-1 ring-orange-200'
    : 'bg-gray-50';
  const textSize = size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${bg}`}>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">{icon}{label}</div>
      <p className={`${textSize} font-bold text-gray-800 tabular-nums`}>
        {value}
        <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );
}

/* ─── session elapsed timer ─────────────────────────────────────────────── */

function useElapsed(startedAt: string | null): string {
  // elapsed (in seconds) lives in state so Date.now() is never called during render.
  // setElapsed is only invoked inside the setInterval callback — never synchronously
  // inside the effect body — satisfying both react-hooks/purity and react-hooks/set-state-in-effect.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const origin = new Date(startedAt).getTime();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - origin) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return '00:00';
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ─── live reading display ──────────────────────────────────────────────── */

function LiveDisplay({ session, patientId }: { session: ActiveSession; patientId: string }) {
  const { reading, streamStatus, readingCount, lastPersistedTs } = useSessionStream(session.id, patientId);
  const router = useRouter();
  const [lastRefreshAt, setLastRefreshAt] = useState(0);
  const elapsed = useElapsed(session.startedAt);

  const isConnected = streamStatus === 'connected';
  const isConnecting = streamStatus === 'connecting';

  useEffect(() => {
    if (!lastPersistedTs) return;

    const now = Date.now();
    if (now - lastRefreshAt < 4000) return;

    setLastRefreshAt(now);
    router.refresh();
  }, [lastPersistedTs, lastRefreshAt, router]);

  return (
    <div className="space-y-5">
      {/* sub-header: connection + timer + reading count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <Wifi className="h-4 w-4" />
              Streaming
            </span>
          ) : isConnecting ? (
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <WifiOff className="h-4 w-4" />
              Connecting…
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-red-500">
              <WifiOff className="h-4 w-4" />
              {streamStatus === 'error' ? 'Connection error' : 'Ended'}
            </span>
          )}

          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {elapsed}
          </span>

          <span className="flex items-center gap-1 text-xs text-gray-400">
            <BarChart2 className="h-3.5 w-3.5" />
            {readingCount} reading{readingCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reading && <StatusBadge status={reading.status} />}
          <Pill on={reading?.fingerDetected ?? false} label="Finger" />
          <Pill on={reading?.skinDetected   ?? false} label="Skin"   />
        </div>
      </div>

      {/* stats grid */}
      {reading ? (
        <div className="space-y-3">
          {/* primary metrics — larger */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Heart className="h-4 w-4 text-red-500" />}
              label="Heart Rate"
              value={reading.bpm.toString()}
              unit="bpm"
              size="lg"
              highlight={reading.bpm > 100 ? 'danger' : reading.bpm > 90 ? 'warn' : 'none'}
            />
            <StatCard
              icon={<Wind className="h-4 w-4 text-sky-500" />}
              label="SpO₂"
              value={reading.spo2.toFixed(1)}
              unit="%"
              size="lg"
              highlight={reading.spo2 < 94 ? 'danger' : reading.spo2 < 96 ? 'warn' : 'none'}
            />
            <StatCard
              icon={<Thermometer className="h-4 w-4 text-orange-500" />}
              label="Temperature"
              value={reading.temperature.toFixed(1)}
              unit="°C"
              size="lg"
              highlight={reading.temperature > 37.5 ? 'danger' : reading.temperature > 37.2 ? 'warn' : 'none'}
            />
            <StatCard
              icon={<Activity className="h-4 w-4 text-purple-500" />}
              label="Stress Score"
              value={reading.stressScore.toString()}
              unit="/ 100"
              size="lg"
              highlight={reading.stressScore > 60 ? 'danger' : reading.stressScore > 30 ? 'warn' : 'none'}
            />
          </div>

          {/* secondary metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<Zap className="h-4 w-4 text-yellow-500" />}
              label="GSR"
              value={reading.gsr.toString()}
              unit="raw"
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-gray-400" />}
              label="GSR Δ"
              value={(reading.gsrDiff >= 0 ? '+' : '') + reading.gsrDiff}
              unit=""
              highlight={Math.abs(reading.gsrDiff) > 80 ? 'danger' : Math.abs(reading.gsrDiff) > 40 ? 'warn' : 'none'}
            />
            <StatCard
              icon={<Activity className="h-4 w-4 text-rose-400" />}
              label="IR"
              value={reading.ir.toString()}
              unit=""
            />
            <StatCard
              icon={<Activity className="h-4 w-4 text-pink-400" />}
              label="Red"
              value={reading.red.toString()}
              unit=""
            />
          </div>

          {/* last updated */}
          <p className="text-right text-xs text-gray-400">
            Last updated {new Date(reading.timestampMs).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-10 text-sm text-gray-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gray-300" />
          Waiting for first reading…
        </div>
      )}
    </div>
  );
}

/* ─── main panel ─────────────────────────────────────────────────────────── */

export function MonitoringPanel({ patientId, initialSession }: Props) {
  const [session, setSession] = useState<ActiveSession | null>(initialSession);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ patientId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ActiveSession = await res.json();
      setSession(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function stopSession() {
    if (!session) return;
    setLoading(true);
    setError(null);
    // Optimistically clear the session so the stream hook disconnects immediately
    const sessionId = session.id;
    setSession(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

      {/* ── card header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FingerprintPattern className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-800">Live Monitoring</h2>
          {session && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              ACTIVE
            </span>
          )}
        </div>

        {session ? (
          <button
            onClick={stopSession}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            {loading ? 'Stopping…' : 'Stop Monitoring'}
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {loading ? 'Starting…' : 'Start Monitoring'}
          </button>
        )}
      </div>

      {/* ── error ── */}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* ── body ── */}
      {session ? (
        <LiveDisplay session={session} patientId={patientId} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-14 text-center">
          <div className="rounded-full bg-indigo-50 p-4">
            <Play className="h-8 w-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">No active session</p>
            <p className="mt-1 text-xs text-gray-400">
              Press <strong>Start Monitoring</strong> to begin a session.<br />
              Sensor readings will update every few seconds.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
