'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SensorReading } from './LiveReadingCard';

interface Props {
  readings: SensorReading[];
  pageSize?: number;
}

const STRESS_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-green-100',  text: 'text-green-700'  },
  2: { bg: 'bg-orange-100', text: 'text-orange-700' },
  3: { bg: 'bg-red-100',    text: 'text-red-700'    },
};

function StressPill({ level, label }: { level: number; label: string }) {
  const s = STRESS_STYLES[level] ?? STRESS_STYLES[1];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
      {label}
    </span>
  );
}

function TrendIcon({ curr, prev }: { curr: number; prev: number | undefined }) {
  if (prev === undefined) return <Minus className="h-3 w-3 text-gray-300" />;
  if (curr > prev + 0.5) return <TrendingUp className="h-3 w-3 text-red-400" />;
  if (curr < prev - 0.5) return <TrendingDown className="h-3 w-3 text-green-500" />;
  return <Minus className="h-3 w-3 text-gray-300" />;
}

export function ReadingsTable({ readings, pageSize = 15 }: Props) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(
    () => [...readings].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [readings]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const slice = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (readings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-400">
        No readings available for this period.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Time</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stress</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Heart Rate</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SpO₂</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Temp</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">GSR Raw</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resistance</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Session / Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {slice.map((r, i) => {
              const prev = slice[i + 1];
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    <div className="font-medium text-gray-700">
                      {new Date(r.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                    <div>{new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StressPill level={r.stressLevel} label={r.stressLabel} />
                  </td>
                  <td className="px-4 py-3">
                    {r.heartRate != null ? (
                      <span className="flex items-center gap-1.5 font-tabular text-gray-800">
                        <TrendIcon curr={r.heartRate} prev={prev?.heartRate ?? undefined} />
                        {r.heartRate} <span className="text-xs text-gray-400">bpm</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.spo2 != null ? (
                      <span className="font-tabular text-gray-800">
                        {r.spo2.toFixed(1)}<span className="text-xs text-gray-400">%</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-tabular text-gray-800">
                      <TrendIcon curr={r.temperature} prev={prev?.temperature ?? undefined} />
                      {r.temperature.toFixed(1)}<span className="text-xs text-gray-400">°C</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-tabular text-gray-800">
                    {r.gsrRaw}
                  </td>
                  <td className="px-4 py-3 font-tabular text-gray-800">
                    {r.resistance.toFixed(1)}<span className="text-xs text-gray-400">Ω</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.stressScore != null && r.status ? (
                      <span className="text-xs text-gray-600">
                        {r.status} ({r.stressScore})
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    <div>{r.sessionId ?? '—'}</div>
                    <div className="text-gray-400">{r.deviceId ?? '—'}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <span className="text-xs text-gray-400">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length} readings
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-gray-600 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
