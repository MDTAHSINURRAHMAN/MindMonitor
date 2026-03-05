'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  BrainCircuit,
  ChartLine,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  Radio,
  Stethoscope,
  Thermometer,
  Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon:   Activity,
    accent: '#f43f5e',
    title:  'Heart Rate Monitoring',
    body:   'Continuous beat-to-beat tracking via photoplethysmography sensors captures HRV anomalies and cardiac stress indicators in real time.',
  },
  {
    icon:   Droplets,
    accent: '#38bdf8',
    title:  'SpO₂ Tracking',
    body:   'Pulse oximetry measures blood oxygen saturation non-invasively, flagging hypoxic episodes linked to anxiety, sleep disruption, and fatigue.',
  },
  {
    icon:   Thermometer,
    accent: '#f97316',
    title:  'Body Temperature Monitoring',
    body:   'Peripheral skin temperature deviations correlate with autonomic nervous system activation, providing a passive stress biomarker.',
  },
  {
    icon:   Zap,
    accent: '#eab308',
    title:  'Stress Detection via GSR',
    body:   'Galvanic skin response electrodes measure electrodermal activity — a direct proxy for sympathetic arousal and acute psychological stress.',
  },
  {
    icon:   Radio,
    accent: '#a855f7',
    title:  'Real-Time Data Streaming',
    body:   'Sensor payloads are transmitted over Wi-Fi through the ESP8266 module to a cloud backend with sub-second end-to-end latency.',
  },
  {
    icon:   LayoutDashboard,
    accent: '#10b981',
    title:  'Doctor Monitoring Dashboard',
    body:   'Clinicians view live and historical vitals for all their patients on a unified, role-based interface with configurable alert thresholds.',
  },
  {
    icon:   ChartLine,
    accent: '#06b6d4',
    title:  'Historical Trend Analysis',
    body:   'Time-series charts powered by TimescaleDB reveal longitudinal stress patterns and recovery trajectories to inform clinical decisions.',
  },
  {
    icon:   Bell,
    accent: '#ec4899',
    title:  'Smart Alerts',
    body:   'Automated anomaly detection triggers instant notifications when physiological readings exceed baseline thresholds, enabling proactive care.',
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  accent,
  title,
  body,
  index,
}: (typeof FEATURES)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.09, ease: 'easeOut' }}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-5 backdrop-blur-sm transition-colors duration-300 hover:bg-white/7"
    >
      {/* top accent line */}
      <div
        className="absolute top-0 left-5 right-5 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* hover glow */}
      <div
        className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `${accent}22` }}
      />

      {/* icon */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10"
        style={{ background: `${accent}15` }}
      >
        <Icon size={18} strokeWidth={1.7} style={{ color: accent }} />
      </div>

      {/* text */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-white/45">{body}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Key Features Section
// ─────────────────────────────────────────────────────────────
export function FeaturesSection() {
  return (
    <section id="features" className="relative isolate overflow-hidden bg-gray-950 px-4 py-28">

      {/* radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 65% 40% at 50% 0%, rgba(168,85,247,0.15) 0%, transparent 70%)',
        }}
      />

      {/* grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">

        {/* ── header ── */}
        <div className="mb-14 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 backdrop-blur-sm"
          >
            <ClipboardList size={12} strokeWidth={2} />
            Full Sensor Coverage
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl"
          >
            Key{' '}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Features
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-lg text-base leading-relaxed text-white/45"
          >
            Eight capabilities working in concert to deliver a complete picture
            of a patient&apos;s physiological and psychological state — around the clock.
          </motion.p>
        </div>

        {/* ── cards grid ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Why This Matters — data
// ─────────────────────────────────────────────────────────────
const PATIENT_POINTS = [
  {
    icon:   Activity,
    title:  'Continuous Monitoring',
    body:   'Physiological data is captured 24 / 7, not just during appointments — ensuring nothing is missed between clinical visits.',
  },
  {
    icon:   BrainCircuit,
    title:  'Early Stress Detection',
    body:   'Baseline deviations in GSR, heart rate, and temperature flag stress episodes early, before they escalate into acute mental health crises.',
  },
  {
    icon:   ChartLine,
    title:  'Better Mental Health Awareness',
    body:   'Patients gain access to personal trend charts and weekly summaries, building self-awareness and encouraging healthier coping strategies.',
  },
] as const;

const DOCTOR_POINTS = [
  {
    icon:   LayoutDashboard,
    title:  'Remote Monitoring',
    body:   'A dedicated clinical dashboard surfaces live vitals for all assigned patients, enabling oversight without requiring physical presence.',
  },
  {
    icon:   Zap,
    title:  'Objective Physiological Data',
    body:   'Quantitative biomarkers replace subjective self-reports, giving clinicians a measurable, reproducible basis for diagnosis and treatment planning.',
  },
  {
    icon:   Stethoscope,
    title:  'Faster Clinical Decisions',
    body:   'Smart alerts and anomaly flags surface critical changes instantly, compressing the time between detection and therapeutic response.',
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Benefit row item
// ─────────────────────────────────────────────────────────────
function BenefitItem({
  icon: Icon,
  title,
  body,
  accent,
  index,
}: { icon: React.ElementType; title: string; body: string; accent: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: 'easeOut' }}
      className="flex gap-4"
    >
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10"
        style={{ background: `${accent}15` }}
      >
        <Icon size={16} strokeWidth={1.7} style={{ color: accent }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="text-xs leading-relaxed text-white/45">{body}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Column card
// ─────────────────────────────────────────────────────────────
function AudienceColumn({
  badge,
  badgeColor,
  badgeBorder,
  badgeBg,
  headline,
  accentColor,
  points,
  itemAccent,
  index,
}: {
  badge: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  headline: string;
  accentColor: string;
  points: typeof PATIENT_POINTS | typeof DOCTOR_POINTS;
  itemAccent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: 'easeOut' }}
      className="group relative flex flex-col gap-7 overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-7 backdrop-blur-sm"
    >
      {/* top accent line */}
      <div
        className="absolute top-0 left-7 right-7 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />

      {/* background glow blob */}
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: accentColor }}
      />

      {/* header */}
      <div className="flex flex-col gap-3">
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border ${badgeBorder} ${badgeBg} px-3 py-1 text-xs font-medium ${badgeColor}`}
        >
          {badge}
        </span>
        <h3 className="text-xl font-bold text-white">{headline}</h3>
      </div>

      {/* benefit items */}
      <div className="flex flex-col gap-5">
        {points.map((p, i) => (
          <BenefitItem key={p.title} icon={p.icon} title={p.title} body={p.body} accent={itemAccent} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Why This Matters Section
// ─────────────────────────────────────────────────────────────
export function WhyMattersSection() {
  return (
    <section id="why" className="relative isolate overflow-hidden bg-gray-950 px-4 py-28">

      {/* radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)',
        }}
      />

      {/* grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">

        {/* ── header ── */}
        <div className="mb-14 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-sm"
          >
            <Activity size={12} strokeWidth={2} />
            Real-World Impact
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl"
          >
            Why This{' '}
            <span className="bg-linear-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent">
              Matters
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-lg text-base leading-relaxed text-white/45"
          >
            MindMonitor creates measurable value for both sides of the care relationship
            — patients gain autonomy over their health, while doctors gain the
            objective data needed to act with confidence.
          </motion.p>
        </div>

        {/* ── two columns ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AudienceColumn
            badge="For Patients"
            badgeColor="text-sky-300"
            badgeBorder="border-sky-500/30"
            badgeBg="bg-sky-500/10"
            headline="Empowering patients with visibility into their own health."
            accentColor="#38bdf8"
            points={PATIENT_POINTS}
            itemAccent="#38bdf8"
            index={0}
          />
          <AudienceColumn
            badge="For Doctors"
            badgeColor="text-emerald-300"
            badgeBorder="border-emerald-500/30"
            badgeBg="bg-emerald-500/10"
            headline="Equipping clinicians with the data they need to act decisively."
            accentColor="#10b981"
            points={DOCTOR_POINTS}
            itemAccent="#10b981"
            index={1}
          />
        </div>

        {/* ── divider to next section ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <div className="h-8 w-px bg-linear-to-b from-white/20 to-transparent" />
        </motion.div>

      </div>
    </section>
  );
}
