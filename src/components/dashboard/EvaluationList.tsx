'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, UserCheck, Download } from 'lucide-react';

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
  patientName?: string;
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
  if (!win) {
    alert('Please allow popups to download the PDF.');
    return;
  }

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Evaluation — ${patient}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      background: #fff;
      font-size: 14px;
      line-height: 1.6;
    }
    .page {
      max-width: 794px;
      margin: 0 auto;
      padding: 56px 64px 100px;
      min-height: 1123px;
      position: relative;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 20px;
      margin-bottom: 32px;
      border-bottom: 2px solid #7c3aed;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 46px; height: 46px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 22px; font-weight: 800;
    }
    .brand-name { font-size: 20px; font-weight: 700; color: #7c3aed; letter-spacing: -0.3px; }
    .brand-sub  { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 2px; }
    .report-meta { text-align: right; }
    .report-type { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; }
    .report-date { font-size: 12px; color: #9ca3af; margin-top: 6px; }
    .report-id   { font-size: 10px; color: #d1d5db; margin-top: 4px; font-family: 'Courier New', monospace; }

    /* ── Confidential badge ── */
    .confidential {
      display: inline-flex; align-items: center; gap: 6px;
      background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px;
      padding: 5px 12px; font-size: 10px; font-weight: 700;
      color: #92400e; text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 28px;
    }

    /* ── Info grid ── */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; margin-bottom: 36px;
    }
    .info-card {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 18px 20px;
    }
    .info-card.patient { border-left: 4px solid #7c3aed; }
    .info-card.doctor  { border-left: 4px solid #10b981; }
    .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 8px; }
    .info-name  { font-size: 16px; font-weight: 700; color: #111827; }
    .info-detail{ font-size: 11px; color: #6b7280; margin-top: 3px; }

    /* ── Sections ── */
    .section { margin-bottom: 28px; }
    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;
    }
    .section-dot { width: 8px; height: 8px; border-radius: 50%; background: #7c3aed; flex-shrink: 0; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7c3aed; }
    .section-body  { font-size: 14px; line-height: 1.9; color: #374151; white-space: pre-wrap; padding-left: 16px; }

    /* ── Follow-up box ── */
    .followup {
      background: #ede9fe; border: 1px solid #c4b5fd; border-radius: 12px;
      padding: 16px 20px; display: flex; align-items: center; gap: 16px; margin-bottom: 40px;
    }
    .followup-icon {
      width: 40px; height: 40px; background: #7c3aed; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 20px; flex-shrink: 0;
    }
    .followup-label { font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .followup-date  { font-size: 16px; font-weight: 700; color: #4c1d95; }

    /* ── Signature ── */
    .signature-section { display: flex; justify-content: flex-end; margin-top: 52px; }
    .signature-block   { text-align: center; min-width: 220px; }
    .signature-line    { height: 52px; border-bottom: 1.5px solid #374151; margin-bottom: 8px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; }
    .signature-cursive { font-family: 'Georgia', 'Times New Roman', serif; font-style: italic; font-size: 28px; color: #7c3aed; letter-spacing: -1px; }
    .signature-name    { font-size: 13px; font-weight: 600; color: #1f2937; }
    .signature-creds   { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* ── Footer ── */
    .footer {
      position: absolute; bottom: 36px; left: 64px; right: 64px;
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 12px; border-top: 1px solid #f3f4f6;
    }
    .footer-left  { font-size: 9px; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.8px; }
    .footer-right { font-size: 9px; color: #d1d5db; }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 40px 48px 80px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">M</div>
      <div>
        <div class="brand-name">MindMonitor Health</div>
        <div class="brand-sub">Mental Health Monitoring System</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-type">Clinical Evaluation Report</div>
      <div class="report-date">${evalDate}</div>
      <div class="report-id">ID: ${reportId}</div>
    </div>
  </div>

  <!-- Confidential -->
  <div class="confidential">&#9888; Confidential Medical Record</div>

  <!-- Patient / Doctor info -->
  <div class="info-grid">
    <div class="info-card patient">
      <div class="info-label">Patient</div>
      <div class="info-name">${patient}</div>
    </div>
    <div class="info-card doctor">
      <div class="info-label">Attending Physician</div>
      <div class="info-name">Dr. ${doctorName}</div>
      <div class="info-detail">${doctorEmail}</div>
    </div>
  </div>

  <!-- Diagnosis -->
  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <div class="section-title">Primary Diagnosis</div>
    </div>
    <div class="section-body">${diagnosis}</div>
  </div>

  <!-- Clinical Notes -->
  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <div class="section-title">Clinical Notes &amp; Observations</div>
    </div>
    <div class="section-body">${notes}</div>
  </div>

  ${recommendations ? `
  <!-- Recommendations -->
  <div class="section">
    <div class="section-header">
      <div class="section-dot"></div>
      <div class="section-title">Treatment &amp; Recommendations</div>
    </div>
    <div class="section-body">${recommendations}</div>
  </div>
  ` : ''}

  ${followUpFormatted ? `
  <!-- Follow-up -->
  <div class="followup">
    <div class="followup-icon">&#128197;</div>
    <div>
      <div class="followup-label">Scheduled Follow-up Appointment</div>
      <div class="followup-date">${followUpFormatted}</div>
    </div>
  </div>
  ` : ''}

  <!-- Signature -->
  <div class="signature-section">
    <div class="signature-block">
      <div class="signature-line">
        <span class="signature-cursive">Dr. ${escapeHtml(evaluation.doctor.name.split(' ').slice(-1)[0])}</span>
      </div>
      <div class="signature-name">Dr. ${doctorName}</div>
      <div class="signature-creds">Attending Physician</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">MindMonitor Health &mdash; Strictly Confidential</div>
    <div class="footer-right">Generated ${generatedOn}</div>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

function EvaluationCard({ evaluation, patientName = 'Patient' }: { evaluation: EvaluationItem; patientName?: string }) {
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
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="shrink-0 ml-3 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadEvaluationPdf(evaluation, patientName);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            title="Download as PDF"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          {expanded
            ? <ChevronUp  className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 text-sm">
          <Section title="Notes"           content={evaluation.notes} />
          <Section title="Recommendations" content={evaluation.recommendations} />
          {evaluation.followUpDate && (
            <div className="flex items-center gap-2 text-indigo-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Follow-up:</span>
              <span>
                {new Date(evaluation.followUpDate).toLocaleDateString([], {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
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
  if (!content) return null;
  return (
    <div>
      <p className="font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

export function EvaluationList({ evaluations, patientName }: Props) {
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
        <EvaluationCard key={ev.id} evaluation={ev} patientName={patientName} />
      ))}
    </div>
  );
}
