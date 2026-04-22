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
} from 'recharts';
import type { TooltipProps } from 'recharts';

export interface GsrPoint {
  recordedAt: string;
  gsrRaw: number;
  gsrBaseline?: number | null;
  gsrDiff?: number | null;
}

interface Props {
  data: GsrPoint[];
}

function GsrTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-md text-sm">
      <p className="font-medium text-white/70 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} style={{ color: entry.color }}>
          {entry.name}: {entry.value ?? '—'} raw
        </p>
      ))}
    </div>
  );
}

export function GsrLineChart({ data }: Props) {
  const formatted = data.map((d) => ({
    time: new Date(d.recordedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    gsrRaw:      d.gsrRaw,
    gsrBaseline: d.gsrBaseline ?? null,
    gsrDiff:     d.gsrDiff ?? null,
  }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-55 items-center justify-center text-sm text-white/30">
        No GSR data in this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} interval="preserveStartEnd" axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
          width={44}
          axisLine={false}
          tickLine={false}
          label={{ value: 'raw', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: 'rgba(255,255,255,0.3)' } }}
        />
        <Tooltip content={<GsrTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
        <Line
          type="monotone"
          dataKey="gsrRaw"
          name="GSR Raw"
          stroke="#8b5cf6"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="gsrBaseline"
          name="GSR Baseline"
          stroke="#6b7280"
          dot={false}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="gsrDiff"
          name="GSR Delta"
          stroke="#f59e0b"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
