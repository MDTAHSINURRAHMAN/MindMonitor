'use client';

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  value: number;     // current temperature in °C
  min?: number;      // default 35
  max?: number;      // default 40
}

function getTempColor(temp: number): string {
  if (temp >= 38.5) return '#ef4444'; // fever – red
  if (temp >= 37.5) return '#f97316'; // elevated – orange
  if (temp >= 36.0) return '#22c55e'; // normal – green
  return '#3b82f6';                   // low – blue
}

function getTempLabel(temp: number): string {
  if (temp >= 38.5) return 'Fever';
  if (temp >= 37.5) return 'Elevated';
  if (temp >= 36.0) return 'Normal';
  return 'Low';
}

export function TemperatureGauge({ value, min = 35, max = 40 }: Props) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = ((clamped - min) / (max - min)) * 100;
  const color = getTempColor(value);
  const label = getTempLabel(value);

  const data = [{ name: 'temp', value: pct, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={210}
            endAngle={-30}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.06)' }}
              dataKey="value"
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* centre overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold" style={{ color }}>
            {value.toFixed(1)}°
          </span>
          <span className="text-xs text-white/40 mt-0.5">{label}</span>
        </div>
      </div>
      <p className="mt-1 text-sm font-medium text-white/50">Body Temperature</p>
    </div>
  );
}
