'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BrainCircuit, ClipboardPlus, CheckCircle2,
  Loader2, UserCheck, Calendar, ChevronDown,
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface Props {
  doctorId: string;
  doctorName: string;
  patients: Patient[];
  preselectedPatientId: string | null;
}

type FormState = {
  diagnosis: string;
  notes: string;
  recommendations: string;
  followUpDate: string;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function EvaluatePageClient({ doctorId, doctorName, patients, preselectedPatientId }: Props) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(preselectedPatientId ?? '');
  const [form, setForm] = useState<FormState>({
    diagnosis: '',
    notes: '',
    recommendations: '',
    followUpDate: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  function setField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit() {
    if (!selectedPatientId) {
      setErrorMsg('Please select a patient.');
      return;
    }
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
          patientId:       selectedPatientId,
          doctorId,
          diagnosis:       form.diagnosis,
          notes:           form.notes,
          recommendations: form.recommendations || '',
          followUpDate:    form.followUpDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Submission failed');
      }

      setStatus('success');
      setForm({ diagnosis: '', notes: '', recommendations: '', followUpDate: '' });
      setTimeout(() => setStatus('idle'), 6000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  const isDisabled = status === 'submitting' || status === 'success';

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Background orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-15 z-0"
        style={{ background: 'rgba(139,92,246,0.5)' }} />
      <div className="pointer-events-none fixed bottom-0 -right-40 h-[400px] w-[400px] rounded-full blur-3xl opacity-10 z-0"
        style={{ background: 'rgba(56,189,248,0.4)' }} />

      {/* Header */}
      {/* <header className="relative z-10 flex items-center justify-between border-b border-white/8 bg-gray-950/80 px-6 py-3 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="flex items-center gap-4">
          <Link
            href="/doctor/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/8 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 ring-1 ring-violet-500/20 shadow-[0_0_14px_rgba(139,92,246,0.2)]">
              <BrainCircuit size={15} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Write Evaluation</p>
              <p className="text-[11px] text-white/35 leading-tight">Dr. {doctorName}</p>
            </div>
          </div>
        </div>
      </header> */}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >

          {/* Patient selector */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/25">
                <UserCheck className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Select Patient</h2>
            </div>

            <div className="relative">
              <select
                value={selectedPatientId}
                onChange={(e) => { setSelectedPatientId(e.target.value); setErrorMsg(''); }}
                disabled={isDisabled}
                className="w-full appearance-none rounded-xl border border-white/10 bg-gray-900/80 px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-60 transition-all"
              >
                <option value="" disabled>— Choose a patient —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            </div>

            {selectedPatient && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300 border border-violet-500/20">
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedPatient.name}</p>
                  <p className="text-xs text-white/35">{selectedPatient.email}</p>
                </div>
              </motion.div>
            )}

            {patients.length === 0 && (
              <p className="mt-3 text-sm text-white/30">No patients assigned to you yet.</p>
            )}
          </div>

          {/* Evaluation form */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/25">
                <ClipboardPlus className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">Clinical Evaluation</h2>
              <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-white/25">Confidential</span>
            </div>

            <div className="space-y-5">

              {/* Diagnosis */}
              <div>
                <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Primary Diagnosis
                  <span className="text-rose-400 normal-case font-normal text-xs">*</span>
                </label>
                <textarea
                  placeholder="Enter primary diagnosis or presenting complaint…"
                  value={form.diagnosis}
                  onChange={setField('diagnosis')}
                  disabled={isDisabled}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Clinical Notes &amp; Observations
                  <span className="text-rose-400 normal-case font-normal text-xs">*</span>
                </label>
                <textarea
                  placeholder="Document clinical observations, findings, symptoms, mental state examination, and assessment details…"
                  value={form.notes}
                  onChange={setField('notes')}
                  disabled={isDisabled}
                  rows={7}
                  className="w-full rounded-xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Recommendations */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Treatment &amp; Recommendations
                </label>
                <textarea
                  placeholder="Outline treatment plan, medications, therapy recommendations, lifestyle modifications, and follow-up actions…"
                  value={form.recommendations}
                  onChange={setField('recommendations')}
                  disabled={isDisabled}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-gray-900/80 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  <Calendar className="h-3 w-3" />
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={setField('followUpDate')}
                  disabled={isDisabled}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded-xl border border-white/10 bg-gray-900/80 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 [color-scheme:dark] transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-400">
                {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={submit}
                disabled={isDisabled}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-900/30"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <ClipboardPlus className="h-4 w-4" />
                    Submit Evaluation
                  </>
                )}
              </button>

              {status === 'success' && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Evaluation submitted — visible in patient&apos;s panel
                </motion.span>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
