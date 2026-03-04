'use client';

import { useEffect, useState } from 'react';
import { Activity, Thermometer, Zap } from 'lucide-react';

export interface SensorReading {
  id: string;
  recordedAt: string;
  gsrRaw: number;
  resistance: number;
  stressLevel: number;
  stressLabel: string;
  temperature: number;
  heartRate?: number | null;
  spo2?: number | null;
}

interface Props {
  initialReading?: SensorReading | null;
  patientId: string;
  /** Polling interval in ms. Default: 5000 */
  pollInterval?: number;
}

const STRESS_STYLES: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-300' },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  3: { bg: 'bg-red-100',    text: 'text-red-700',    ring: 'ring-red-300'   },
};

function StressBadge({ level, label }: { level: number; label: string }) {
  const style = STRESS_STYLES[level] ?? STRESS_STYLES[1];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${level === 3 ? 'animate-pulse bg-red-500' : level === 2 ? 'bg-orange-400' : 'bg-green-500'}`}
      />
      {label}
    </span>
  );
}

export function LiveReadingCard({
  initialReading,
  patientId,
  pollInterval = 5000,
}: Props) {
  const [reading, setReading] = useState<SensorReading | null>(
    initialReading ?? null
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialReading ? new Date(initialReading.recordedAt) : null
  );

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(
          `/api/readings?patientId=${patientId}&range=24h`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data: SensorReading[] = await res.json();
        if (data.length > 0) {
          const latest = data[data.length - 1];
          setReading(latest);
          setLastUpdated(new Date(latest.recordedAt));
        }
      } catch {
        // silently ignore network errors during polling
      }
    }

    fetchLatest();
    const id = setInterval(fetchLatest, pollInterval);
    return () => clearInterval(id);
  }, [patientId, pollInterval]);

  if (!reading) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
        No readings available yet. Waiting for sensor data…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Live Reading</h2>
        <div className="flex items-center gap-2">
          <StressBadge level={reading.stressLevel} label={reading.stressLabel} />
          <span className="text-xs text-gray-400">
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* GSR Raw */}
        <Stat
          icon={<Zap className="h-4 w-4 text-yellow-500" />}
          label="GSR Raw"
          value={reading.gsrRaw.toString()}
          unit="ADC"
        />
        {/* Resistance */}
        <Stat
          icon={<Activity className="h-4 w-4 text-purple-500" />}
          label="Resistance"
          value={reading.resistance.toFixed(1)}
          unit="kΩ"
        />
        {/* Temperature */}
        <Stat
          icon={<Thermometer className="h-4 w-4 text-blue-500" />}
          label="Temperature"
          value={reading.temperature.toFixed(1)}
          unit="°C"
        />
        {/* Heart Rate (optional) */}
        {reading.heartRate != null && (
          <Stat
            icon={<Activity className="h-4 w-4 text-red-500" />}
            label="Heart Rate"
            value={reading.heartRate.toString()}
            unit="bpm"
          />
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-gray-800">
        {value}
        <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  );
}
