'use client';

import { useState } from 'react';
import { AlertTriangle, X, Info, Flame } from 'lucide-react';

export interface AlertItem {
  id: string;
  type: 'HIGH_STRESS' | 'PROLONGED_STRESS' | 'RAPID_CHANGE' | 'TEMPERATURE_ANOMALY';
  message: string;
  severity: number;  // 1–3
  createdAt: string;
}

interface Props {
  alerts: AlertItem[];
  /** Called after a successful server-side acknowledge so parent can refresh */
  onAcknowledged?: (alertId: string) => void;
}

const TYPE_META = {
  HIGH_STRESS:         { label: 'High Stress',         icon: Flame,         color: 'red'    },
  PROLONGED_STRESS:    { label: 'Prolonged Stress',     icon: AlertTriangle, color: 'orange' },
  RAPID_CHANGE:        { label: 'Rapid Change',         icon: AlertTriangle, color: 'yellow' },
  TEMPERATURE_ANOMALY: { label: 'Temperature Anomaly',  icon: Info,          color: 'blue'   },
} as const;

const COLOR_MAP = {
  red:    { wrapper: 'border-red-200 bg-red-50',     icon: 'text-red-500',    badge: 'bg-red-100 text-red-700',    btn: 'hover:bg-red-100 text-red-400'    },
  orange: { wrapper: 'border-orange-200 bg-orange-50', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700', btn: 'hover:bg-orange-100 text-orange-400' },
  yellow: { wrapper: 'border-yellow-200 bg-yellow-50', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700', btn: 'hover:bg-yellow-100 text-yellow-500' },
  blue:   { wrapper: 'border-blue-200 bg-blue-50',   icon: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700',   btn: 'hover:bg-blue-100 text-blue-400'   },
} as const;

function SingleAlert({
  alert,
  onDismiss,
}: {
  alert: AlertItem;
  onDismiss: (id: string) => void;
}) {
  const [dismissing, setDismissing] = useState(false);
  const meta = TYPE_META[alert.type] ?? TYPE_META.HIGH_STRESS;
  const colors = COLOR_MAP[meta.color as keyof typeof COLOR_MAP];
  const Icon = meta.icon;

  async function handleDismiss() {
    setDismissing(true);
    try {
      await fetch(`/api/alerts/${alert.id}/acknowledge`, { method: 'PATCH' });
    } catch {
      /* ignore – still dismiss locally */
    } finally {
      onDismiss(alert.id);
    }
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${colors.wrapper}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colors.icon}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.badge}`}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(alert.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-700">{alert.message}</p>
      </div>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className={`rounded-md p-1 transition-colors ${colors.btn} disabled:opacity-40`}
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AlertBanner({ alerts, onAcknowledged }: Props) {
  const [visible, setVisible] = useState<Set<string>>(
    new Set(alerts.map((a) => a.id))
  );

  function dismiss(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onAcknowledged?.(id);
  }

  const active = alerts.filter((a) => visible.has(a.id));

  if (active.length === 0) return null;

  return (
    <div className="space-y-2" role="list" aria-label="Active alerts">
      {active.map((alert) => (
        <SingleAlert key={alert.id} alert={alert} onDismiss={dismiss} />
      ))}
    </div>
  );
}
