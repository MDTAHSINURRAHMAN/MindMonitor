'use client';

import { useState, useCallback } from 'react';
import { PatientListSidebar } from '@/components/dashboard/PatientListSidebar';
import { PatientDetailPanel } from '@/components/dashboard/PatientDetailPanel';
import { AlertFeed }          from '@/components/dashboard/AlertFeed';
import type { PatientSummary } from '@/components/dashboard/PatientListSidebar';
import { Bell, Users, AlertTriangle, Activity } from 'lucide-react';

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
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-5">
          <div>
            <h1 className="text-base font-semibold text-gray-800">Doctor Dashboard</h1>
            <p className="text-xs text-gray-400">Dr. {doctorName}</p>
          </div>

          {/* Live triage stats */}
          <div className="hidden md:flex items-center gap-2 divide-x divide-gray-100">
            <div className="flex items-center gap-1.5 pr-2 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{triage.total}</span>
              <span>patients</span>
            </div>
            {triage.critical > 0 && (
              <div className="flex items-center gap-1.5 pl-2 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {triage.critical} critical
              </div>
            )}
            {triage.totalAlerts > 0 && (
              <div className="flex items-center gap-1.5 pl-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {triage.totalAlerts} unresolved
              </div>
            )}
          </div>
        </div>

        {/* Panel toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setPanelView('patient')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              panelView === 'patient'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Patient Detail
          </button>
          <button
            onClick={() => setPanelView('alerts')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              panelView === 'alerts'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible */}
        <PatientListSidebar
          doctorId={doctorId}
          selectedPatientId={selectedPatient?.id ?? null}
          onPatientsLoaded={handlePatientsLoaded}
          onSelect={(p) => {
            setSelectedPatient(p);
            setPanelView('patient');
          }}
        />

        {/* Right panel */}
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
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                <Activity className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">No patient selected</p>
                <p className="mt-1 text-xs text-gray-400">
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
