'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SensorReading } from './LiveReadingCard';

interface Props {
  readings: SensorReading[];
  pageSize?: number;
}

const STRESS_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  2: { bg: 'bg-amber-500/15',   text: 'text-amber-400'   },
  3: { bg: 'bg-rose-500/15',    text: 'text-rose-400'    },
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

function DetectionPill({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (value == null) return <span className="text-white/15">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-white/5 ${value ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/25'}`}>
      {label}: {value ? 'Yes' : 'No'}
    </span>
  );
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
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-10 text-center text-sm text-white/25">
        No readings available for this period.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/4 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">Time</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide">Stress</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">Heart Rate</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide">SpO₂</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide">Temp</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">GSR Raw</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">GSR Delta</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">Finger / Skin</th>
              <th className="px-4 py-3 text-xs font-semibold text-white/35 uppercase tracking-wide whitespace-nowrap">Session / Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {slice.map((r, i) => {
              const prev = slice[i + 1];
              return (
                <tr key={r.id} className="hover:bg-white/4 transition-colors">
                  <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">
                    <div className="font-medium text-white/60">
                      {new Date(r.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                    <div>{new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StressPill level={r.stressLevel} label={r.stressLabel} />
                    {r.stressScore != null && (
                      <div className="mt-0.5 text-xs text-white/25">{r.stressScore}/100</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.heartRate != null ? (
                      <span className="flex items-center gap-1.5 tabular-nums text-white/75">
                        <TrendIcon curr={r.heartRate} prev={prev?.heartRate ?? undefined} />
                        {r.heartRate} <span className="text-xs text-white/30">bpm</span>
                      </span>
                    ) : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.spo2 != null ? (
                      <span className="tabular-nums text-white/75">
                        {r.spo2.toFixed(1)}<span className="text-xs text-white/30">%</span>
                      </span>
                    ) : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 tabular-nums text-white/75">
                      <TrendIcon curr={r.temperature} prev={prev?.temperature ?? undefined} />
                      {r.temperature.toFixed(1)}<span className="text-xs text-white/30">°C</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-white/75">
                    {r.gsrRaw}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.gsrDiff != null ? (
                      <span className={r.gsrDiff > 0 ? 'text-amber-400' : 'text-white/50'}>
                        {r.gsrDiff > 0 ? '+' : ''}{r.gsrDiff}
                      </span>
                    ) : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.status ? (
                      <span className="text-xs text-white/50">{r.status}</span>
                    ) : (
                      <span className="text-white/15">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <DetectionPill value={r.fingerDetected} label="Finger" />
                      <DetectionPill value={r.skinDetected}   label="Skin" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/35 whitespace-nowrap">
                    <div>{r.sessionId ?? '—'}</div>
                    <div className="text-white/20">{r.deviceId ?? '—'}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
          <span className="text-xs text-white/25">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length} readings
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg p-1 text-white/30 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-white/40 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-lg p-1 text-white/30 hover:bg-white/5 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
