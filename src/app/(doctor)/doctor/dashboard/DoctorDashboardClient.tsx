'use client';

import { useState } from 'react';
import { PatientListSidebar } from '@/components/dashboard/PatientListSidebar';
import { PatientDetailPanel } from '@/components/dashboard/PatientDetailPanel';
import { AlertFeed }          from '@/components/dashboard/AlertFeed';
import type { PatientSummary } from '@/components/dashboard/PatientListSidebar';
import { Bell, Users } from 'lucide-react';

interface Props {
  doctorId: string;
  doctorName: string;
}

type PanelView = 'patient' | 'alerts';

export function DoctorDashboardClient({ doctorId, doctorName }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('patient');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Doctor Dashboard</h1>
          <p className="text-xs text-gray-400">Dr. {doctorName}</p>
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
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible */}
        <PatientListSidebar
          doctorId={doctorId}
          selectedPatientId={selectedPatient?.id ?? null}
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
            <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-3">
              <Users className="h-10 w-10" />
              <p className="text-sm">Select a patient from the sidebar to view their details.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
