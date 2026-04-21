'use client';

import { useState } from 'react';
import { X, CalendarPlus, Clock } from 'lucide-react';

interface Props {
  patientId: string;
  patientName: string;
  doctorId: string;
  onScheduled: (appointment: Appointment) => void;
  onClose: () => void;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  roomId: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  patient: { id: string; name: string; email: string };
  doctor:  { id: string; name: string; email: string };
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function AppointmentScheduler({ patientId, patientName, doctorId, onScheduled, onClose }: Props) {
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return toLocalDatetimeValue(d);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const minDatetime = toLocalDatetimeValue(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/appointments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          patientId,
          doctorId,
          scheduledAt: new Date(scheduledAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to schedule appointment');
      }

      const appointment: Appointment = await res.json();
      onScheduled(appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2.5">
              <CalendarPlus className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Schedule Video Call</h2>
              <p className="text-xs text-gray-400">with {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time picker */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Clock className="h-3.5 w-3.5" />
              Date &amp; Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDatetime}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Scheduling…' : 'Schedule Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
