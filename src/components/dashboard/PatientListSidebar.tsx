'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, User, RefreshCw } from 'lucide-react';

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
  latestStressLevel: number | null;
  latestStressLabel: string | null;
  latestReadingAt: string | null;
  unacknowledgedAlerts: number;
}

interface Props {
  doctorId: string;
  selectedPatientId: string | null;
  onSelect: (patient: PatientSummary) => void;
  /** Polling interval in ms — default 30 000 */
  pollInterval?: number;
}

const STRESS_BADGE: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  3: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

function StressBadge({ level, label }: { level: number; label: string }) {
  const style = STRESS_BADGE[level] ?? STRESS_BADGE[1];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot} ${level === 3 ? 'animate-pulse' : ''}`}
      />
      {label}
    </span>
  );
}

export function PatientListSidebar({
  doctorId,
  selectedPatientId,
  onSelect,
  pollInterval = 30_000,
}: Props) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients?doctorId=${doctorId}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load patients');
      const data: PatientSummary[] = await res.json();
      setPatients(data);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, pollInterval);
    return () => clearInterval(id);
  }, [fetchPatients, pollInterval]);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Assigned Patients</h2>
          <button
            onClick={fetchPatients}
            title="Refresh"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}

        {!loading && error && (
          <p className="px-4 py-4 text-xs text-red-500">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-gray-400">No patients found.</p>
        )}

        {!loading &&
          filtered.map((patient) => {
            const isSelected = patient.id === selectedPatientId;
            const stressLevel = patient.latestStressLevel ?? 0;
            return (
              <button
                key={patient.id}
                onClick={() => onSelect(patient)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                  isSelected ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isSelected
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {patient.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isSelected ? 'text-indigo-700' : 'text-gray-800'
                      }`}
                    >
                      {patient.name}
                    </p>
                    {patient.unacknowledgedAlerts > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {patient.unacknowledgedAlerts > 9 ? '9+' : patient.unacknowledgedAlerts}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{patient.email}</p>
                  {patient.latestStressLabel && stressLevel > 0 && (
                    <div className="mt-1.5">
                      <StressBadge
                        level={stressLevel}
                        label={patient.latestStressLabel}
                      />
                    </div>
                  )}
                  {!patient.latestStressLabel && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      <User className="h-3 w-3" />
                      No readings
                    </span>
                  )}
                </div>
              </button>
            );
          })}
      </div>

      {/* Footer count */}
      {!loading && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          <p className="text-xs text-gray-400">
            {filtered.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </aside>
  );
}
