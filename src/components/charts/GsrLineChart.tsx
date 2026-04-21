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
  resistance: number;
}

interface Props {
  data: GsrPoint[];
}

function GsrTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey as string} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {entry.dataKey === 'gsrRaw'
            ? `${entry.value} raw`
            : `${(entry.value as number)?.toFixed(1)} Ω`}
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
    gsrRaw:     d.gsrRaw,
    resistance: d.resistance,
  }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        No GSR data in this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis
          yAxisId="raw"
          tick={{ fontSize: 11 }}
          width={44}
          label={{ value: 'raw', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#9ca3af' } }}
        />
        <YAxis
          yAxisId="res"
          orientation="right"
          tick={{ fontSize: 11 }}
          width={48}
          tickFormatter={(v: number) => `${v}Ω`}
        />
        <Tooltip content={<GsrTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="raw"
          type="monotone"
          dataKey="gsrRaw"
          name="GSR Raw"
          stroke="#8b5cf6"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="res"
          type="monotone"
          dataKey="resistance"
          name="Resistance (Ω)"
          stroke="#f59e0b"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
