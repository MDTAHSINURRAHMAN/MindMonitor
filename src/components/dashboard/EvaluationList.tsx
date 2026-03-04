'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, UserCheck } from 'lucide-react';

export interface EvaluationItem {
  id: string;
  diagnosis: string;
  notes: string;
  recommendations: string;
  followUpDate?: string | null;
  createdAt: string;
  doctor: {
    id: string;
    name: string;
    email: string;
  };
}

interface Props {
  evaluations: EvaluationItem[];
}

function EvaluationCard({ evaluation }: { evaluation: EvaluationItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate">{evaluation.diagnosis}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Dr. {evaluation.doctor.name} ·{' '}
              {new Date(evaluation.createdAt).toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="shrink-0 ml-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 text-sm">
          <Section title="Notes" content={evaluation.notes} />
          <Section title="Recommendations" content={evaluation.recommendations} />
          {evaluation.followUpDate && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Follow-up:</span>
              <span>
                {new Date(evaluation.followUpDate).toLocaleDateString([], {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

export function EvaluationList({ evaluations }: Props) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
        No evaluations from your doctor yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evaluations.map((ev) => (
        <EvaluationCard key={ev.id} evaluation={ev} />
      ))}
    </div>
  );
}
