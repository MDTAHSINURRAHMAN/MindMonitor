'use client';

import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, User, TrendingUp, ClipboardList } from 'lucide-react';

import { LiveReadingCard }       from './LiveReadingCard';
import { EvaluationList }        from './EvaluationList';
import { EvaluationForm }        from './EvaluationForm';
import type { PatientSummary }   from './PatientListSidebar';
import type { EvaluationItem }   from './EvaluationList';
import type { SensorReading }    from './LiveReadingCard';

import { StressLineChart }       from '@/components/charts/StressLineChart';
import { TemperatureGauge }      from '@/components/charts/TemperatureGauge';
import { StressDistributionPie } from '@/components/charts/StressDistributionPie';

interface Props {
  patient: PatientSummary;
  doctorId: string;
}

type RangeKey = '24h' | '7d' | '30d';
const RANGES: RangeKey[] = ['24h', '7d', '30d'];

const RANGE_LABELS: Record<RangeKey, string> = {
  '24h': '24 Hours',
  '7d':  '7 Days',
  '30d': '30 Days',
};

type ActiveTab = 'history' | 'evaluations';

export function PatientDetailPanel({ patient, doctorId }: Props) {
  const [range, setRange] = useState<RangeKey>('24h');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(true);
  const [loadingEvals, setLoadingEvals] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('history');

  /* ── Fetch readings ── */
  const fetchReadings = useCallback(async () => {
    setLoadingReadings(true);
    try {
      const res = await fetch(
        `/api/readings?patientId=${patient.id}&range=${range}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data: SensorReading[] = await res.json();
        setReadings(data);
      }
    } finally {
      setLoadingReadings(false);
    }
  }, [patient.id, range]);

  /* ── Fetch evaluations ── */
  const fetchEvals = useCallback(async () => {
    setLoadingEvals(true);
    try {
      const res = await fetch(
        `/api/evaluations?patientId=${patient.id}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data: EvaluationItem[] = await res.json();
        setEvaluations(data);
      }
    } finally {
      setLoadingEvals(false);
    }
  }, [patient.id]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  useEffect(() => {
    fetchEvals();
  }, [fetchEvals]);

  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-gray-50 p-6 gap-6">
      {/* Patient header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{patient.name}</h2>
          <p className="text-sm text-gray-400">{patient.email}</p>
        </div>
      </div>

      {/* Live reading */}
      <LiveReadingCard patientId={patient.id} initialReading={latest} />

      {/* Range picker */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 mr-1">Range:</span>
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              range === r
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
        <button
          onClick={fetchReadings}
          className="ml-auto rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingReadings ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Charts */}
      {readings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
            <StressLineChart data={readings} />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <StressDistributionPie data={readings} />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {latest?.temperature != null ? (
              <TemperatureGauge value={latest.temperature} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 py-8">
                No temperature data
              </div>
            )}
          </div>
        </div>
      ) : (
        !loadingReadings && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
            No readings available for this range.
          </div>
        )
      )}

      {/* Tabs: Evaluations / New Evaluation */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['history', 'evaluations'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              {tab === 'history' ? 'Evaluation History' : 'New Evaluation'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'history' ? (
            loadingEvals ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : evaluations.length === 0 ? (
              <p className="text-sm text-gray-400">No evaluations yet.</p>
            ) : (
              <EvaluationList evaluations={evaluations} />
            )
          ) : (
            <EvaluationForm
              patientId={patient.id}
              doctorId={doctorId}
              onSubmitted={() => {
                fetchEvals();
                setActiveTab('history');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
