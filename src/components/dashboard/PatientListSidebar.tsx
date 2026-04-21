'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, User, RefreshCw, ArrowUpDown, UserPlus, X, Loader2 } from 'lucide-react';

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
  latestStressLevel: number | null;
  latestStressLabel: string | null;
  latestReadingAt: string | null;
  unacknowledgedAlerts: number;
}

interface AvailablePatient {
  id: string;
  name: string;
  email: string;
}

interface Props {
  doctorId: string;
  selectedPatientId: string | null;
  onSelect: (patient: PatientSummary) => void;
  onPatientsLoaded?: (patients: PatientSummary[]) => void;
  pollInterval?: number;
}

type SortKey = 'stress' | 'alerts' | 'name';

const STRESS_ACCENT: Record<number, string> = {
  1: 'border-l-green-400',
  2: 'border-l-orange-400',
  3: 'border-l-red-500',
};

const STRESS_BADGE: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  3: { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
};

function StressBadge({ level, label }: { level: number; label: string }) {
  const style = STRESS_BADGE[level] ?? STRESS_BADGE[1];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${level === 3 ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AddPatientDropdown({
  doctorId,
  onAssigned,
}: {
  doctorId: string;
  onAssigned: () => void;
}) {
  const [open, setOpen]               = useState(false);
  const [available, setAvailable]     = useState<AvailablePatient[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [assigning, setAssigning]     = useState<string | null>(null);
  const [query, setQuery]             = useState('');
  const ref                           = useRef<HTMLDivElement>(null);

  const fetchAvailable = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/patients/available?doctorId=${doctorId}`, { cache: 'no-store' });
      if (res.ok) setAvailable(await res.json());
    } finally {
      setLoadingList(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (open) fetchAvailable();
  }, [open, fetchAvailable]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function assign(patientId: string) {
    setAssigning(patientId);
    try {
      await fetch('/api/patients/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, patientId }),
      });
      setAvailable((prev) => prev.filter((p) => p.id !== patientId));
      onAssigned();
    } finally {
      setAssigning(null);
    }
  }

  const filtered = available.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Add patient"
        className="rounded-md p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <span className="text-xs font-semibold text-gray-700">Add Patient</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {loadingList && (
                <div className="flex items-center justify-center py-4 text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}

              {!loadingList && filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-400">
                  {available.length === 0 ? 'All patients already assigned.' : 'No matches.'}
                </p>
              )}

              {!loadingList && filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => assign(p.id)}
                  disabled={assigning === p.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800">{p.name}</p>
                    <p className="truncate text-[10px] text-gray-400">{p.email}</p>
                  </div>
                  {assigning === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500 shrink-0" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientListSidebar({
  doctorId,
  selectedPatientId,
  onSelect,
  onPatientsLoaded,
  pollInterval = 30_000,
}: Props) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [query, setQuery]       = useState('');
  const [sortBy, setSortBy]     = useState<SortKey>('stress');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients?doctorId=${doctorId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load patients');
      const data: PatientSummary[] = await res.json();
      setPatients(data);
      setError('');
      onPatientsLoaded?.(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [doctorId, onPatientsLoaded]);

  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, pollInterval);
    return () => clearInterval(id);
  }, [fetchPatients, pollInterval]);

  const searched = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.email.toLowerCase().includes(query.toLowerCase()),
  );

  const filtered = [...searched].sort((a, b) => {
    if (sortBy === 'stress')  return (b.latestStressLevel ?? 0) - (a.latestStressLevel ?? 0);
    if (sortBy === 'alerts')  return b.unacknowledgedAlerts - a.unacknowledgedAlerts;
    return a.name.localeCompare(b.name);
  });

  const critical = patients.filter((p) => p.latestStressLevel === 3).length;
  const elevated = patients.filter((p) => p.latestStressLevel === 2).length;
  const normal   = patients.filter((p) => p.latestStressLevel === 1).length;

  const SORT_OPTS: { key: SortKey; label: string }[] = [
    { key: 'stress', label: 'Stress' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'name',   label: 'Name'   },
  ];

  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Patients</h2>
          <div className="flex items-center gap-1">
            <AddPatientDropdown doctorId={doctorId} onAssigned={fetchPatients} />
            <button
              onClick={fetchPatients}
              title="Refresh"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Triage summary chips */}
        {!loading && patients.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {critical > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {critical} Critical
              </span>
            )}
            {elevated > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                {elevated} Elevated
              </span>
            )}
            {normal > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {normal} Normal
              </span>
            )}
          </div>
        )}

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

        {/* Sort options */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-400 mr-0.5">Sort:</span>
          {SORT_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sortBy === key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto py-1">
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
          <div className="px-4 py-8 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">No patients assigned yet.</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Use the <UserPlus className="inline h-3 w-3" /> button above to add patients.
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((patient) => {
            const isSelected   = patient.id === selectedPatientId;
            const stressLevel  = patient.latestStressLevel ?? 0;
            const accentClass  = stressLevel > 0 ? STRESS_ACCENT[stressLevel] : 'border-l-gray-200';
            const avatarClass  =
              isSelected        ? 'bg-indigo-100 text-indigo-700' :
              stressLevel === 3 ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600';

            return (
              <button
                key={patient.id}
                onClick={() => onSelect(patient)}
                className={`flex w-full items-start gap-3 border-l-[3px] px-4 py-3 text-left transition-all hover:bg-gray-50 ${accentClass} ${
                  isSelected ? 'bg-indigo-50' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}>
                  {patient.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`truncate text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {patient.name}
                    </p>
                    {patient.unacknowledgedAlerts > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {patient.unacknowledgedAlerts > 9 ? '9+' : patient.unacknowledgedAlerts}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5 gap-1">
                    <p className="truncate text-xs text-gray-400">{patient.email}</p>
                    {patient.latestReadingAt && (
                      <span className="shrink-0 text-[10px] text-gray-300">
                        {timeAgo(patient.latestReadingAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    {patient.latestStressLabel && stressLevel > 0 ? (
                      <StressBadge level={stressLevel} label={patient.latestStressLabel} />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                        <User className="h-3 w-3" />
                        No readings
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {/* Footer */}
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
