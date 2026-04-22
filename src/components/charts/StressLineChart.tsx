'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { TooltipProps } from 'recharts';

export interface SensorReadingPoint {
  recordedAt: string;
  stressLevel: number;
  temperature: number;
}

interface Props {
  data: SensorReadingPoint[];
}

const STRESS_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

function StressTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-md text-sm">
      <p className="font-medium text-white/70 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {entry.dataKey === 'stress'
            ? `${entry.value} (${STRESS_LABELS[entry.value as number] ?? '—'})`
            : `${(entry.value as number)?.toFixed(1)} °C`}
        </p>
      ))}
    </div>
  );
}

export function StressLineChart({ data }: Props) {
  const formatted = data.map((d) => ({
    time: new Date(d.recordedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    stress: d.stressLevel,
    temp: d.temperature,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatted} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
          interval="preserveStartEnd"
          axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          tickLine={false}
        />
        <YAxis
          yAxisId="stress"
          domain={[0, 3]}
          ticks={[1, 2, 3]}
          tickFormatter={(v: number) => STRESS_LABELS[v] ?? v}
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
          width={56}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="temp"
          orientation="right"
          domain={[35, 39]}
          tickFormatter={(v: number) => `${v}°`}
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
          width={40}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<StressTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
        <ReferenceLine
          yAxisId="stress"
          y={3}
          stroke="#ef4444"
          strokeDasharray="4 4"
          label={{ value: 'High', fill: '#ef4444', fontSize: 11 }}
        />
        <Line
          yAxisId="stress"
          type="monotone"
          dataKey="stress"
          name="Stress Level"
          stroke="#ef4444"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          name="Temperature (°C)"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
