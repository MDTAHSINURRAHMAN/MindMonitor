'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PatientListSidebar } from '@/components/dashboard/PatientListSidebar';
import { PatientDetailPanel } from '@/components/dashboard/PatientDetailPanel';
import { AlertFeed }          from '@/components/dashboard/AlertFeed';
import type { PatientSummary } from '@/components/dashboard/PatientListSidebar';
import { Bell, Users, AlertTriangle, Activity, BrainCircuit } from 'lucide-react';

interface Props {
  doctorId: string;
  doctorName: string;
}

type PanelView = 'patient' | 'alerts';

interface TriageStats {
  total: number;
  critical: number;
  totalAlerts: number;
}

export function DoctorDashboardClient({ doctorId, doctorName }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [panelView, setPanelView]             = useState<PanelView>('patient');
  const [triage, setTriage]                   = useState<TriageStats>({ total: 0, critical: 0, totalAlerts: 0 });

  const handlePatientsLoaded = useCallback((patients: PatientSummary[]) => {
    setTriage({
      total:       patients.length,
      critical:    patients.filter((p) => p.latestStressLevel === 3).length,
      totalAlerts: patients.reduce((sum, p) => sum + p.unacknowledgedAlerts, 0),
    });
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-125 w-125 rounded-full blur-3xl opacity-15 z-0"
        style={{ background: 'rgba(139,92,246,0.5)' }} />
      <div className="pointer-events-none fixed bottom-0 -right-40 h-100 w-100 rounded-full blur-3xl opacity-10 z-0"
        style={{ background: 'rgba(56,189,248,0.4)' }} />

      {/* ── Top bar ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/8 bg-gray-950/80 px-6 py-3 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">

        {/* subtle top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="flex items-center gap-5">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 ring-1 ring-violet-500/20 shadow-[0_0_14px_rgba(139,92,246,0.2)]">
              <BrainCircuit size={15} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Doctor Dashboard</p>
              <p className="text-[11px] text-white/35 leading-tight">Dr. {doctorName}</p>
            </div>
          </div>

          {/* Live triage stats */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/50">
              <Users className="h-3.5 w-3.5 text-white/30" />
              <span className="font-bold text-white/80">{triage.total}</span>
              <span>patients</span>
            </div>

            {triage.critical > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/25 px-3 py-1 text-xs font-semibold text-red-400 ring-1 ring-red-500/20"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {triage.critical} critical
              </motion.div>
            )}

            {triage.totalAlerts > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-xs font-semibold text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {triage.totalAlerts} unresolved
              </div>
            )}
          </div>
        </div>

        {/* Panel toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
          <button
            onClick={() => setPanelView('patient')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              panelView === 'patient'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Patient Detail
          </button>
          <button
            onClick={() => setPanelView('alerts')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              panelView === 'alerts'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            Alert Feed
            {triage.totalAlerts > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {triage.totalAlerts > 99 ? '99+' : triage.totalAlerts}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <PatientListSidebar
          doctorId={doctorId}
          selectedPatientId={selectedPatient?.id ?? null}
          onPatientsLoaded={handlePatientsLoaded}
          onSelect={(p) => {
            setSelectedPatient(p);
            setPanelView('patient');
          }}
        />

        <main className="flex-1 overflow-hidden">
          {panelView === 'alerts' ? (
            <div className="h-full p-6">
              <AlertFeed
                doctorId={doctorId}
                highlightPatientId={selectedPatient?.id}
              />
            </div>
          ) : selectedPatient ? (
            <PatientDetailPanel
              patient={selectedPatient}
              doctorId={doctorId}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-md ring-1 ring-violet-500/10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
                  <Activity className="h-7 w-7 text-violet-400/60" />
                </div>
                <p className="text-sm font-semibold text-white/60">No patient selected</p>
                <p className="mt-1 text-xs text-white/30">
                  Choose a patient from the sidebar to view their health data.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
