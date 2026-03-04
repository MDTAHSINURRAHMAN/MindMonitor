'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Flame, Info, Bell, RefreshCw, CheckCheck } from 'lucide-react';

export interface FeedAlert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'HIGH_STRESS' | 'PROLONGED_STRESS' | 'RAPID_CHANGE' | 'TEMPERATURE_ANOMALY';
  message: string;
  severity: number;
  acknowledged: boolean;
  createdAt: string;
}

interface Props {
  doctorId: string;
  /** Polling interval ms. Default 15 000 */
  pollInterval?: number;
  /** Highlight a specific patient's alerts */
  highlightPatientId?: string | null;
}

const TYPE_META = {
  HIGH_STRESS:         { label: 'High Stress',        Icon: Flame,         color: 'red'    },
  PROLONGED_STRESS:    { label: 'Prolonged Stress',   Icon: AlertTriangle, color: 'orange' },
  RAPID_CHANGE:        { label: 'Rapid Change',       Icon: AlertTriangle, color: 'yellow' },
  TEMPERATURE_ANOMALY: { label: 'Temp. Anomaly',      Icon: Info,          color: 'blue'   },
} as const;

const COLOR_MAP = {
  red:    { wrap: 'border-red-200 bg-red-50',       icon: 'text-red-500',    badge: 'bg-red-100 text-red-700'    },
  orange: { wrap: 'border-orange-200 bg-orange-50', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  yellow: { wrap: 'border-yellow-200 bg-yellow-50', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
  blue:   { wrap: 'border-blue-200 bg-blue-50',     icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700'  },
} as const;

function AlertRow({
  alert,
  highlighted,
  onAck,
}: {
  alert: FeedAlert;
  highlighted: boolean;
  onAck: (id: string) => void;
}) {
  const [acking, setAcking] = useState(false);
  const meta = TYPE_META[alert.type] ?? TYPE_META.HIGH_STRESS;
  const colors = COLOR_MAP[meta.color as keyof typeof COLOR_MAP];
  const { Icon } = meta;

  async function handleAck() {
    setAcking(true);
    try {
      await fetch(`/api/alerts/${alert.id}/acknowledge`, { method: 'PATCH' });
      onAck(alert.id);
    } catch {
      setAcking(false);
    }
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${colors.wrap} ${
        highlighted ? 'ring-2 ring-indigo-400' : ''
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badge}`}>
            {meta.label}
          </span>
          <span className="text-xs font-medium text-gray-600">{alert.patientName}</span>
          <span className="text-xs text-gray-400">
            {new Date(alert.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-700">{alert.message}</p>
      </div>
      {!alert.acknowledged && (
        <button
          onClick={handleAck}
          disabled={acking}
          title="Acknowledge"
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-green-600 transition-colors disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AlertFeed({
  doctorId,
  pollInterval = 15_000,
  highlightPatientId,
}: Props) {
  const [alerts, setAlerts] = useState<FeedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/alerts?doctorId=${doctorId}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data: FeedAlert[] = await res.json();
        setAlerts(data);
      }
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, pollInterval);
    return () => clearInterval(id);
  }, [fetchAlerts, pollInterval]);

  function handleAck(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }

  const visible = alerts.filter((a) => showAcknowledged || !a.acknowledged);
  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Alert Feed</h3>
          {unackCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unackCount > 99 ? '99+' : unackCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="h-3.5 w-3.5 accent-indigo-600"
            />
            <span className="text-xs text-gray-500">Show resolved</span>
          </label>
          <button
            onClick={fetchAlerts}
            title="Refresh"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <Bell className="h-6 w-6" />
            <p className="text-sm">No active alerts</p>
          </div>
        )}

        {!loading &&
          visible.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              highlighted={!!highlightPatientId && alert.patientId === highlightPatientId}
              onAck={handleAck}
            />
          ))}
      </div>
    </div>
  );
}
