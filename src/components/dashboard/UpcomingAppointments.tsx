'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video, Calendar, Clock, X, PhoneCall,
  PhoneOff, CheckCircle, History,
} from 'lucide-react';
import { VideoCallRoom } from './VideoCallRoom';
import type { Appointment } from './AppointmentScheduler';

interface Props {
  patientId: string;
  patientName: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const secs = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  return `in ${Math.floor(hrs / 24)}d`;
}

async function patchAppointment(id: string, status: string): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status }),
  });
  return res.json();
}

export function UpcomingAppointments({ patientId, patientName }: Props) {
  const [upcoming,  setUpcoming]  = useState<Appointment[]>([]);
  const [history,   setHistory]   = useState<Appointment[]>([]);
  const [incomingCall, setIncomingCall] = useState<Appointment | null>(null);
  const [activeCall,   setActiveCall]   = useState<Appointment | null>(null);
  const [showHistory,  setShowHistory]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [upRes, histRes] = await Promise.all([
        fetch(`/api/appointments?patientId=${patientId}&status=SCHEDULED,ACTIVE`, { cache: 'no-store' }),
        fetch(`/api/appointments?patientId=${patientId}&status=COMPLETED,CANCELLED`, { cache: 'no-store' }),
      ]);

      if (upRes.ok) {
        const data: Appointment[] = await upRes.json();
        setUpcoming(data);

        // If doctor started the call, surface the incoming-call notification
        const live = data.find((a) => a.status === 'ACTIVE');
        if (live && !activeCall) {
          setIncomingCall(live);
        }
      }

      if (histRes.ok) {
        const data: Appointment[] = await histRes.json();
        setHistory(data.reverse()); // newest first
      }
    } catch {
      // silent — polling will retry
    }
  }, [patientId, activeCall]);

  // Initial load + poll every 5 s
  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  async function handleAnswer(appt: Appointment) {
    setIncomingCall(null);
    setActiveCall(appt);
  }

  async function handleLeave() {
    if (!activeCall) return;
    await patchAppointment(activeCall.id, 'COMPLETED');
    setActiveCall(null);
    fetchAll();
  }

  function handleDecline() {
    setIncomingCall(null);
  }

  const scheduled = upcoming.filter((a) => a.status === 'SCHEDULED');

  return (
    <>
      {/* ── Incoming call notification ── */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Pulsing top bar */}
            <div className="bg-indigo-600 px-6 py-5 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/40 animate-pulse">
                <Video className="h-8 w-8 text-white" />
              </div>
              <p className="text-xs font-medium uppercase tracking-widest text-indigo-200">Incoming Video Call</p>
              <p className="mt-1 text-xl font-bold text-white">Dr. {incomingCall.doctor.name}</p>
            </div>

            <div className="px-6 py-5">
              <p className="text-center text-sm text-gray-500 mb-6">
                Scheduled for {formatDateTime(incomingCall.scheduledAt)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-200 transition-colors"
                >
                  <PhoneOff className="h-4 w-4" />
                  Decline
                </button>
                <button
                  onClick={() => handleAnswer(incomingCall)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <PhoneCall className="h-4 w-4" />
                  Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full-screen video call ── */}
      {activeCall && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
          <div className="flex items-center justify-between bg-gray-800 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Video className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">
                Video call with Dr. {activeCall.doctor.name}
              </span>
            </div>
            <button
              onClick={handleLeave}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              End Call
            </button>
          </div>
          <div className="flex-1">
            <VideoCallRoom
              roomId={activeCall.roomId}
              userId={patientId}
              userName={patientName}
              onLeave={handleLeave}
            />
          </div>
        </div>
      )}

      {/* ── Dashboard card ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-800">Video Appointments</h2>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <History className="h-3.5 w-3.5" />
                {showHistory ? 'Hide history' : `History (${history.length})`}
              </button>
            )}
          </div>

          {/* Upcoming / scheduled */}
          {scheduled.length > 0 && (
            <div className="space-y-3 mb-4">
              {scheduled.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2">
                      <Video className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Dr. {appt.doctor.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(appt.scheduledAt)}
                        <span className="ml-1 font-semibold text-indigo-600">
                          ({timeUntil(appt.scheduledAt)})
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Scheduled
                  </span>
                </div>
              ))}
            </div>
          )}

          {scheduled.length === 0 && !showHistory && (
            <p className="text-sm text-gray-400">No upcoming appointments.</p>
          )}

          {/* History */}
          {showHistory && history.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Past Calls
              </p>
              {history.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-1.5 ${appt.status === 'COMPLETED' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {appt.status === 'COMPLETED'
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <X className="h-4 w-4 text-gray-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Dr. {appt.doctor.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(appt.scheduledAt)}
                        {appt.startedAt && appt.endedAt && (
                          <span className="ml-2 text-green-600 font-medium">
                            · {formatDuration(appt.startedAt, appt.endedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    appt.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {appt.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
    </>
  );
}
