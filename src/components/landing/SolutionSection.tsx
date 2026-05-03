'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  BrainCircuit,
  ChartLine,
  CircuitBoard,
  Cloud,
  Database,
  Stethoscope,
  Wifi,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Tech stack pill
// ─────────────────────────────────────────────────────────────
interface TechPillProps {
  icon: React.ElementType;
  label: string;
  delay: number;
}

function TechPill({ icon: Icon, label, delay }: TechPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur-sm"
    >
      <Icon size={13} strokeWidth={1.75} className="text-violet-400" />
      <span className="text-xs font-medium text-white/60">{label}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ElementType;
  accent: string;
  ring: string;
  glow: string;
  number: string;
  title: string;
  body: string;
  index: number;
}

function FeatureCard({
  icon: Icon,
  accent,
  ring,
  glow,
  number,
  title,
  body,
  index,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: 'easeOut' }}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-6 ring-1 ${ring} backdrop-blur-sm transition-colors duration-300 hover:bg-white/7`}
    >
      {/* corner number */}
      <span className="absolute top-5 right-5 text-3xl font-black tabular-nums leading-none opacity-[0.06] select-none">
        {number}
      </span>

      {/* top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px opacity-50"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      {/* hover glow */}
      <div
        className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />

      {/* icon */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10"
        style={{ background: `${accent}18` }}
      >
        <Icon size={22} strokeWidth={1.6} style={{ color: accent }} />
      </div>

      {/* text */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-white/50">{body}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Architecture flow diagram (SVG-based)
// ─────────────────────────────────────────────────────────────
const ARCH_NODES = [
  { label: 'Arduino\nUno', icon: CircuitBoard, color: '#f43f5e', x: 10 },
  { label: 'ESP8266\nWi-Fi', icon: Wifi, color: '#f97316', x: 27.5 },
  { label: 'Firebase\nRTDB', icon: Cloud, color: '#a855f7', x: 45 },
  { label: 'Supabase\nPostgreSQL', icon: Database, color: '#38bdf8', x: 62.5 },
  { label: 'Next.js\nDashboard', icon: Activity, color: '#10b981', x: 80 },
] as const;

function ArchDiagram() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/4 px-6 py-8 ring-1 ring-white/5 backdrop-blur-sm"
    >
      {/* label */}
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-white/30">
        System Architecture
      </p>

      {/* nodes + connectors */}
      <div className="relative flex items-center justify-between gap-2">
        {ARCH_NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="relative flex flex-1 flex-col items-center gap-2">
              {/* connector arrow between nodes */}
              {i < ARCH_NODES.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.12 }}
                  className="absolute top-5 left-[calc(50%+22px)] right-[-50%] h-px origin-left"
                  style={{
                    background: `linear-gradient(90deg, ${node.color}60, ${ARCH_NODES[i + 1].color}60)`,
                  }}
                />
              )}

              {/* icon bubble */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.12 }}
                className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                style={{ background: `${node.color}18` }}
              >
                <Icon size={18} strokeWidth={1.6} style={{ color: node.color }} />
              </motion.div>

              {/* label */}
              <span className="whitespace-pre-wrap text-center text-[10px] leading-tight text-white/40">
                {node.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const TECH_STACK = [
  { icon: CircuitBoard, label: 'Arduino Uno' },
  { icon: Wifi,         label: 'ESP8266 Wi-Fi' },
  { icon: Cloud,        label: 'Firebase RTDB' },
  { icon: Database,     label: 'Supabase' },
  { icon: Activity,     label: 'Next.js Dashboard' },
] as const;

const FEATURES: Omit<FeatureCardProps, 'index'>[] = [
  {
    icon:   Activity,
    accent: '#f43f5e',
    ring:   'ring-rose-500/25',
    glow:   'rgba(244,63,94,0.15)',
    number: '01',
    title:  'Real-Time Physiological Monitoring',
    body:   'Arduino-powered sensors capture heart rate, skin temperature, SpO₂, and electrodermal activity at high frequency. Data streams over Wi-Fi through the ESP8266 module with sub-second latency.',
  },
  {
    icon:   Cloud,
    accent: '#38bdf8',
    ring:   'ring-sky-500/25',
    glow:   'rgba(56,189,248,0.13)',
    number: '02',
    title:  'Real-Time Cloud Infrastructure',
    body:   'Sensor payloads stream instantly into Firebase Realtime Database for live updates. Supabase PostgreSQL persists structured health records with Prisma ORM, enabling fast queries and long-term trend analysis.',
  },
  {
    icon:   Stethoscope,
    accent: '#a855f7',
    ring:   'ring-violet-500/25',
    glow:   'rgba(168,85,247,0.13)',
    number: '03',
    title:  'Remote Doctor Monitoring',
    body:   'Clinicians access a dedicated dashboard with live patient vitals, configurable alert thresholds, and push notifications. Threshold breaches trigger automated alerts so doctors can intervene before a crisis develops.',
  },
  {
    icon:   ChartLine,
    accent: '#10b981',
    ring:   'ring-emerald-500/25',
    glow:   'rgba(16,185,129,0.12)',
    number: '04',
    title:  'Historical Health Trend Analysis',
    body:   'Interactive time-series charts expose stress trajectories, recovery patterns, and longitudinal baselines. Doctors can correlate physiological trends with clinical evaluations to build a complete patient picture over time.',
  },
];

// ─────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────
export function SolutionSection() {
  return (
    <section id="solution" className="relative isolate overflow-hidden bg-gray-950 px-4 py-28">

      {/* radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(56,189,248,0.14) 0%, transparent 70%)',
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
        <div className="mb-16 flex flex-col items-center text-center">

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-medium text-sky-300 backdrop-blur-sm"
          >
            <BrainCircuit size={12} strokeWidth={2} />
            Intelligent by Design
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl"
          >
            Our{' '}
            <span className="bg-linear-to-r from-sky-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              Solution
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-white/45"
          >
            MindMonitor combines embedded hardware, cloud infrastructure, and
            clinical-grade dashboards into a seamless end-to-end pipeline — bringing
            continuous, objective mental health monitoring into everyday care.
          </motion.p>

          {/* tech stack pills */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.26 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {TECH_STACK.map((t, i) => (
              <TechPill key={t.label} icon={t.icon} label={t.label} delay={0.3 + i * 0.07} />
            ))}
          </motion.div>
        </div>

        {/* ── architecture diagram ── */}
        <div className="mb-10">
          <ArchDiagram />
        </div>

        {/* ── feature cards (2×2) ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>

      </div>
    </section>
  );
}
