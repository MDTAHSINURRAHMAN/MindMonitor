'use client';

import { useState } from 'react';
import { ClipboardPlus, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  patientId: string;
  doctorId: string;
  /** Optional callback fired after a successful submission */
  onSubmitted?: () => void;
}

type FormState = {
  diagnosis: string;
  notes: string;
  recommendations: string;
  followUpDate: string;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function EvaluationForm({ patientId, doctorId, onSubmitted }: Props) {
  const [form, setForm] = useState<FormState>({
    diagnosis: '',
    notes: '',
    recommendations: '',
    followUpDate: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit() {
    if (!form.diagnosis.trim() || !form.notes.trim()) {
      setErrorMsg('Diagnosis and clinical notes are required.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          doctorId,
          diagnosis: form.diagnosis,
          notes: form.notes,
          recommendations: form.recommendations,
          followUpDate: form.followUpDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? 'Submission failed');
      }

      setStatus('success');
      setForm({ diagnosis: '', notes: '', recommendations: '', followUpDate: '' });
      onSubmitted?.();

      // Reset to idle after 3 s
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  const isDisabled = status === 'submitting' || status === 'success';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <ClipboardPlus className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-gray-800 text-base">New Evaluation</h3>
      </div>

      <div className="space-y-4">
        {/* Diagnosis */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Diagnosis <span className="text-red-400">*</span>
          </label>
          <textarea
            placeholder="Primary diagnosis / presenting complaint…"
            value={form.diagnosis}
            onChange={set('diagnosis')}
            disabled={isDisabled}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          />
        </div>

        {/* Clinical Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Clinical Notes <span className="text-red-400">*</span>
          </label>
          <textarea
            placeholder="Observations, clinical findings…"
            value={form.notes}
            onChange={set('notes')}
            disabled={isDisabled}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Recommendations
          </label>
          <textarea
            placeholder="Treatment plan, lifestyle advice…"
            value={form.recommendations}
            onChange={set('recommendations')}
            disabled={isDisabled}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          />
        </div>

        {/* Follow-up date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Follow-up Date
          </label>
          <input
            type="date"
            value={form.followUpDate}
            onChange={set('followUpDate')}
            disabled={isDisabled}
            min={new Date().toISOString().split('T')[0]}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      </div>

      {/* Error */}
      {(status === 'error' || errorMsg) && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={isDisabled}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit Evaluation'
          )}
        </button>

        {status === 'success' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
