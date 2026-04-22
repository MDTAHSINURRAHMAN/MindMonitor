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
  1: 'border-l-emerald-500',
  2: 'border-l-amber-400',
  3: 'border-l-rose-500',
};

const STRESS_BADGE: Record<number, { bg: string; text: string; dot: string }> = {
  1: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  2: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  3: { bg: 'bg-rose-500/15',    text: 'text-rose-400',    dot: 'bg-rose-500'    },
};

function StressBadge({ level, label }: { level: number; label: string }) {
  const style = STRESS_BADGE[level] ?? STRESS_BADGE[1];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/5 ${style.bg} ${style.text}`}>
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
        className="rounded-lg p-1.5 text-white/30 hover:bg-violet-500/10 hover:text-violet-400 transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-gray-950/95 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/5">
          {/* glow */}
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-3xl opacity-20 bg-violet-500" />

          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <span className="text-xs font-semibold text-white/70">Add Patient</span>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
              <input
                type="text"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-7 pr-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                autoFocus
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {loadingList && (
                <div className="flex items-center justify-center py-4 text-white/30">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!loadingList && filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-white/30">
                  {available.length === 0 ? 'All patients already assigned.' : 'No matches.'}
                </p>
              )}
              {!loadingList && filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => assign(p.id)}
                  disabled={assigning === p.id}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-white/6 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-300">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80">{p.name}</p>
                    <p className="truncate text-[10px] text-white/35">{p.email}</p>
                  </div>
                  {assigning === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400 shrink-0" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5 text-violet-400/50 shrink-0" />
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
    <aside className="flex h-full w-72 flex-col border-r border-white/8 bg-gray-950/60 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/8 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Patients</h2>
          <div className="flex items-center gap-1">
            <AddPatientDropdown doctorId={doctorId} onAssigned={fetchPatients} />
            <button
              onClick={fetchPatients}
              title="Refresh"
              className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Triage chips */}
        {!loading && patients.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {critical > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                {critical} Critical
              </span>
            )}
            {elevated > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {elevated} Elevated
              </span>
            )}
            {normal > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {normal} Normal
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Search patients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3 text-white/25 shrink-0" />
          <span className="text-[11px] text-white/30 mr-0.5">Sort:</span>
          {SORT_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sortBy === key
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : 'text-white/30 hover:text-white/60'
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
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-white/30">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}

        {!loading && error && (
          <p className="px-4 py-4 text-xs text-rose-400">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-white/15" />
            <p className="text-xs text-white/30">No patients assigned yet.</p>
            <p className="text-xs text-white/20 mt-0.5">
              Use the <UserPlus className="inline h-3 w-3" /> button above to add patients.
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((patient) => {
            const isSelected   = patient.id === selectedPatientId;
            const stressLevel  = patient.latestStressLevel ?? 0;
            const accentClass  = stressLevel > 0 ? STRESS_ACCENT[stressLevel] : 'border-l-white/10';

            const avatarBg =
              isSelected        ? 'bg-violet-500/25 text-violet-300 border-violet-500/30' :
              stressLevel === 3 ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' :
              stressLevel === 2 ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
              stressLevel === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                                  'bg-white/8 text-white/50 border-white/10';

            return (
              <button
                key={patient.id}
                onClick={() => onSelect(patient)}
                className={`flex w-full items-start gap-3 border-l-[3px] px-4 py-3 text-left transition-all duration-200 hover:bg-white/4 ${accentClass} ${
                  isSelected ? 'bg-violet-500/8' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${avatarBg}`}>
                  {patient.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`truncate text-sm font-semibold ${isSelected ? 'text-violet-300' : 'text-white/80'}`}>
                      {patient.name}
                    </p>
                    {patient.unacknowledgedAlerts > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {patient.unacknowledgedAlerts > 9 ? '9+' : patient.unacknowledgedAlerts}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5 gap-1">
                    <p className="truncate text-xs text-white/30">{patient.email}</p>
                    {patient.latestReadingAt && (
                      <span className="shrink-0 text-[10px] text-white/20">
                        {timeAgo(patient.latestReadingAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    {patient.latestStressLabel && stressLevel > 0 ? (
                      <StressBadge level={stressLevel} label={patient.latestStressLabel} />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/25">
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
        <div className="border-t border-white/8 px-4 py-2.5">
          <p className="text-[11px] text-white/25">
            {filtered.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </aside>
  );
}
