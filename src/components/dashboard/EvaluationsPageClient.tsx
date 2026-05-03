'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Calendar, Download,
  ClipboardList, Stethoscope, Clock, FileText,
} from 'lucide-react';
import type { EvaluationItem } from './EvaluationList';

interface Props {
  evaluations: EvaluationItem[];
  patientName: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadEvaluationPdf(evaluation: EvaluationItem, patientName: string) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) { alert('Please allow popups to download the PDF.'); return; }

  const evalDate = new Date(evaluation.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const followUpFormatted = evaluation.followUpDate
    ? new Date(evaluation.followUpDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const diagnosis       = escapeHtml(evaluation.diagnosis);
  const notes           = escapeHtml(evaluation.notes);
  const recommendations = evaluation.recommendations ? escapeHtml(evaluation.recommendations) : '';
  const doctorName      = escapeHtml(evaluation.doctor.name);
  const doctorEmail     = escapeHtml(evaluation.doctor.email);
  const patient         = escapeHtml(patientName);
  const reportId        = evaluation.id.slice(0, 16).toUpperCase();
  const generatedOn     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Clinical Evaluation — ${patient}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f2937;background:#fff;font-size:14px;line-height:1.6;}.page{max-width:794px;margin:0 auto;padding:56px 64px 100px;min-height:1123px;position:relative;}.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;margin-bottom:32px;border-bottom:2px solid #7c3aed;}.brand{display:flex;align-items:center;gap:14px;}.brand-icon{width:46px;height:46px;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:800;}.brand-name{font-size:20px;font-weight:700;color:#7c3aed;}.brand-sub{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.2px;margin-top:2px;}.report-meta{text-align:right;}.report-type{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:2px;}.report-date{font-size:12px;color:#9ca3af;margin-top:6px;}.report-id{font-size:10px;color:#d1d5db;margin-top:4px;font-family:'Courier New',monospace;}.confidential{display:inline-flex;align-items:center;gap:6px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:5px 12px;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:28px;}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px;}.info-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;}.info-card.patient{border-left:4px solid #7c3aed;}.info-card.doctor{border-left:4px solid #10b981;}.info-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:8px;}.info-name{font-size:16px;font-weight:700;color:#111827;}.info-detail{font-size:11px;color:#6b7280;margin-top:3px;}.section{margin-bottom:28px;}.section-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;}.section-dot{width:8px;height:8px;border-radius:50%;background:#7c3aed;flex-shrink:0;}.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7c3aed;}.section-body{font-size:14px;line-height:1.9;color:#374151;white-space:pre-wrap;padding-left:16px;}.followup{background:#ede9fe;border:1px solid #c4b5fd;border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;margin-bottom:40px;}.followup-icon{width:40px;height:40px;background:#7c3aed;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0;}.followup-label{font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}.followup-date{font-size:16px;font-weight:700;color:#4c1d95;}.signature-section{display:flex;justify-content:flex-end;margin-top:52px;}.signature-block{text-align:center;min-width:220px;}.signature-line{height:52px;border-bottom:1.5px solid #374151;margin-bottom:8px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;}.signature-cursive{font-family:'Georgia','Times New Roman',serif;font-style:italic;font-size:28px;color:#7c3aed;letter-spacing:-1px;}.signature-name{font-size:13px;font-weight:600;color:#1f2937;}.signature-creds{font-size:11px;color:#6b7280;margin-top:2px;}.footer{position:absolute;bottom:36px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #f3f4f6;}.footer-left{font-size:9px;color:#d1d5db;text-transform:uppercase;letter-spacing:0.8px;}.footer-right{font-size:9px;color:#d1d5db;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}.page{padding:40px 48px 80px;}}</style></head><body><div class="page"><div class="header"><div class="brand"><div class="brand-icon">M</div><div><div class="brand-name">MindMonitor Health</div><div class="brand-sub">Mental Health Monitoring System</div></div></div><div class="report-meta"><div class="report-type">Clinical Evaluation Report</div><div class="report-date">${evalDate}</div><div class="report-id">ID: ${reportId}</div></div></div><div class="confidential">&#9888; Confidential Medical Record</div><div class="info-grid"><div class="info-card patient"><div class="info-label">Patient</div><div class="info-name">${patient}</div></div><div class="info-card doctor"><div class="info-label">Attending Physician</div><div class="info-name">Dr. ${doctorName}</div><div class="info-detail">${doctorEmail}</div></div></div><div class="section"><div class="section-header"><div class="section-dot"></div><div class="section-title">Primary Diagnosis</div></div><div class="section-body">${diagnosis}</div></div><div class="section"><div class="section-header"><div class="section-dot"></div><div class="section-title">Clinical Notes &amp; Observations</div></div><div class="section-body">${notes}</div></div>${recommendations ? `<div class="section"><div class="section-header"><div class="section-dot"></div><div class="section-title">Treatment &amp; Recommendations</div></div><div class="section-body">${recommendations}</div></div>` : ''}${followUpFormatted ? `<div class="followup"><div class="followup-icon">&#128197;</div><div><div class="followup-label">Scheduled Follow-up Appointment</div><div class="followup-date">${followUpFormatted}</div></div></div>` : ''}<div class="signature-section"><div class="signature-block"><div class="signature-line"><span class="signature-cursive">Dr. ${escapeHtml(evaluation.doctor.name.split(' ').slice(-1)[0])}</span></div><div class="signature-name">Dr. ${doctorName}</div><div class="signature-creds">Attending Physician</div></div></div><div class="footer"><div class="footer-left">MindMonitor Health &mdash; Strictly Confidential</div><div class="footer-right">Generated ${generatedOn}</div></div></div><script>window.onload=function(){window.print();};</script></body></html>`;

  win.document.write(html);
  win.document.close();
}

function DoctorAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold text-sm">
      {initials}
    </div>
  );
}

function EvalCard({ evaluation, patientName }: { evaluation: EvaluationItem; patientName: string }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(evaluation.createdAt).toLocaleDateString([], {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const hasFollowUp = !!evaluation.followUpDate;
  const followUpStr = hasFollowUp
    ? new Date(evaluation.followUpDate!).toLocaleDateString([], {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  const isUpcoming = hasFollowUp && new Date(evaluation.followUpDate!) > new Date();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-200 hover:border-violet-500/30 hover:bg-white/8">
      {/* Subtle glow on upcoming follow-up */}
      {isUpcoming && (
        <div className="pointer-events-none absolute top-0 right-0 h-20 w-40 rounded-full blur-2xl opacity-10"
          style={{ background: 'rgba(139,92,246,0.8)' }} />
      )}

      {/* Card header */}
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <DoctorAvatar name={evaluation.doctor.name} />
          <div className="min-w-0">
            <p className="font-semibold text-white truncate leading-snug">{evaluation.diagnosis}</p>
            <p className="text-xs text-white/40 mt-0.5">
              Dr. {evaluation.doctor.name} · {dateStr}
            </p>
          </div>
        </div>

        <div className="shrink-0 ml-3 flex items-center gap-2">
          {isUpcoming && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-300">
              <Clock className="h-3 w-3" />
              Follow-up
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); downloadEvaluationPdf(evaluation, patientName); }}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
            title="Download as PDF"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          {expanded
            ? <ChevronUp  className="h-4 w-4 text-white/30" />
            : <ChevronDown className="h-4 w-4 text-white/30" />
          }
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10 px-5 py-4 space-y-4">
          <EvalSection title="Clinical Notes" content={evaluation.notes} />
          <EvalSection title="Recommendations" content={evaluation.recommendations} />
          {followUpStr && (
            <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
              <Calendar className="h-4 w-4 text-violet-400 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/70 mb-0.5">Follow-up Appointment</p>
                <p className="text-sm font-medium text-violet-200">{followUpStr}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvalSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">{title}</p>
      <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md ring-1 ring-violet-500/20">
      <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full blur-2xl opacity-15"
        style={{ background: 'rgba(139,92,246,0.8)' }} />
      <div className="mb-2 flex items-center gap-2">
        <span className="text-violet-400">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function EvaluationsPageClient({ evaluations, patientName }: Props) {
  const stats = useMemo(() => {
    const uniqueDoctors = new Set(evaluations.map((e) => e.doctor.id)).size;
    const upcoming = evaluations
      .filter((e) => e.followUpDate && new Date(e.followUpDate) > new Date())
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());
    const nextFollowUp = upcoming[0]?.followUpDate
      ? new Date(upcoming[0].followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '—';
    return { total: evaluations.length, uniqueDoctors, nextFollowUp };
  }, [evaluations]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950">

      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-125 w-125 rounded-full blur-3xl opacity-20"
        style={{ background: 'rgba(139,92,246,0.5)' }} />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-100 w-100 rounded-full blur-3xl opacity-15"
        style={{ background: 'rgba(56,189,248,0.5)' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-75 w-75 rounded-full blur-3xl opacity-10"
        style={{ background: 'rgba(244,63,94,0.5)' }} />

      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* Page header */}
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 backdrop-blur-sm">
            <ClipboardList className="h-3.5 w-3.5" />
            Clinical Records
          </div>
          <h1 className="text-2xl font-extrabold text-white">My Evaluations</h1>
          <p className="text-sm text-white/40 mt-1">Clinical evaluations submitted by your doctor</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<FileText className="h-4 w-4" />}     label="Total"      value={stats.total} />
          <StatCard icon={<Stethoscope className="h-4 w-4" />}  label="Physicians" value={stats.uniqueDoctors} />
          <StatCard icon={<Calendar className="h-4 w-4" />}     label="Next Follow-up" value={stats.nextFollowUp} />
        </div>

        {/* Evaluation cards */}
        {evaluations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-12 text-center backdrop-blur-md">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-sm font-medium text-white/30">No evaluations from your doctor yet.</p>
            <p className="text-xs text-white/20 mt-1">Evaluations will appear here once your doctor submits them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev) => (
              <EvalCard key={ev.id} evaluation={ev} patientName={patientName} />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
