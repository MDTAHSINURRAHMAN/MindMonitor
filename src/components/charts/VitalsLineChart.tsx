'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { TooltipProps } from 'recharts';

export interface VitalsPoint {
  recordedAt: string;
  heartRate: number | null;
  spo2: number | null;
}

interface Props {
  data: VitalsPoint[];
}

function VitalsTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {entry.dataKey === 'bpm'
            ? `${entry.value} bpm`
            : `${(entry.value as number)?.toFixed(1)} %`}
        </p>
      ))}
    </div>
  );
}

export function VitalsLineChart({ data }: Props) {
  const formatted = data
    .filter((d) => d.heartRate != null || d.spo2 != null)
    .map((d) => ({
      time: new Date(d.recordedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      bpm:  d.heartRate ?? undefined,
      spo2: d.spo2 ?? undefined,
    }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        No heart rate / SpO₂ data in this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis
          yAxisId="bpm"
          domain={[40, 160]}
          tickFormatter={(v: number) => `${v}`}
          tick={{ fontSize: 11 }}
          width={40}
          label={{ value: 'bpm', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#9ca3af' } }}
        />
        <YAxis
          yAxisId="spo2"
          orientation="right"
          domain={[90, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11 }}
          width={44}
        />
        <Tooltip content={<VitalsTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine yAxisId="bpm" y={100} stroke="#ef4444" strokeDasharray="4 4"
          label={{ value: 'Tachycardia', fill: '#ef4444', fontSize: 10 }} />
        <ReferenceLine yAxisId="spo2" y={94} stroke="#f97316" strokeDasharray="4 4"
          label={{ value: 'Low SpO₂', fill: '#f97316', fontSize: 10 }} />
        <Line
          yAxisId="bpm"
          type="monotone"
          dataKey="bpm"
          name="Heart Rate"
          stroke="#ef4444"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="spo2"
          type="monotone"
          dataKey="spo2"
          name="SpO₂ (%)"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
