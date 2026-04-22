'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface Props {
  data: { stressLevel: number }[];
}

const BUCKETS = [
  { key: 1, label: 'Low',    color: '#22c55e' },
  { key: 2, label: 'Medium', color: '#f97316' },
  { key: 3, label: 'High',   color: '#ef4444' },
];

function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const innerPayload = entry.payload as { total?: number };
  const value = entry.value as number;
  const total = innerPayload?.total ?? 0;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 px-3 py-2 shadow-xl backdrop-blur-md text-sm">
      <p className="font-medium" style={{ color: entry.color }}>
        {entry.name}
      </p>
      <p className="text-white/50">
        {value} readings ({pct}%)
      </p>
    </div>
  );
}

export function StressDistributionPie({ data }: Props) {
  const counts = BUCKETS.map(({ key, label, color }) => ({
    name: label,
    value: data.filter((d) => d.stressLevel === key).length,
    color,
    total: data.length,
  }));

  const hasData = counts.some((c) => c.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-50 items-center justify-center text-sm text-white/30">
        No readings yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={counts}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {counts.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
