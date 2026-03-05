'use client';

import { motion } from 'framer-motion';
import { CalendarClock, RadioTower, SignalZero } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const CARDS = [
  {
    icon: SignalZero,
    accent: '#f43f5e',
    ring:   'ring-rose-500/25',
    glow:   'rgba(244,63,94,0.15)',
    title:  'Limited Monitoring',
    body:
      'Traditional assessments rely on self-reporting and isolated clinical snapshots. Physiological signals — heart rate, electrodermal activity, skin temperature — fluctuate continuously, yet are rarely captured between appointments.',
    stat:   '< 1 hour',
    statLabel: 'of data captured per year in typical care',
  },
  {
    icon: CalendarClock,
    accent: '#a855f7',
    ring:   'ring-violet-500/25',
    glow:   'rgba(168,85,247,0.15)',
    title:  'Delayed Diagnosis',
    body:
      'Periodic clinical visits create wide observation gaps. Early-stage stress escalation and mood deterioration often go unnoticed until symptoms become severe, narrowing the window for timely intervention.',
    stat:   '11 years',
    statLabel: 'average delay between onset and first treatment',
  },
  {
    icon: RadioTower,
    accent: '#38bdf8',
    ring:   'ring-sky-500/25',
    glow:   'rgba(56,189,248,0.15)',
    title:  'Lack of Continuous Data',
    body:
      'Without longitudinal physiological data, clinicians lack the context to distinguish transient stress from persistent patterns. Gaps in data make trend analysis, risk scoring, and proactive care nearly impossible.',
    stat:   '50 %',
    statLabel: 'of mental health cases left untreated globally',
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
interface CardProps {
  icon: React.ElementType;
  accent: string;
  ring: string;
  glow: string;
  title: string;
  body: string;
  stat: string;
  statLabel: string;
  index: number;
}

function ProblemCard({ icon: Icon, accent, ring, glow, title, body, stat, statLabel, index }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.12, ease: 'easeOut' }}
      className={`
        group relative flex flex-col gap-5 overflow-hidden rounded-2xl
        border border-white/10 bg-white/4 p-6
        backdrop-blur-sm ring-1 ${ring}
        transition-colors duration-300 hover:bg-white/7
      `}
    >
      {/* glow blob */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />

      {/* top divider accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* icon */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
        style={{ background: `${accent}18` }}
      >
        <Icon size={20} strokeWidth={1.75} style={{ color: accent }} />
      </div>

      {/* text */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-white/50">{body}</p>
      </div>

      {/* stat callout */}
      <div className="mt-auto flex items-baseline gap-2 border-t border-white/[0.07] pt-4">
        <span className="text-xl font-bold tabular-nums" style={{ color: accent }}>
          {stat}
        </span>
        <span className="text-xs text-white/35">{statLabel}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────
export function ProblemSection() {
  return (
    <section id="problem" className="relative isolate overflow-hidden bg-gray-950 px-4 py-28">

      {/* subtle radial glow behind section center */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 70%)',
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
            transition={{ duration: 0.45 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-300 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Why It Matters
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl"
          >
            The Challenge in{' '}
            <span
              className="bg-linear-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent"
            >
              Mental Health Monitoring
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-white/45"
          >
            Mental health conditions are among the most under-detected in modern
            medicine. Episodic care models, self-reported symptoms, and the absence
            of real-time physiological data leave critical warning signs invisible
            until a crisis emerges.
          </motion.p>
        </div>

        {/* ── cards ── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card, i) => (
            <ProblemCard key={card.title} {...card} index={i} />
          ))}
        </div>

        {/* ── bottom connector hint ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-16 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-white/30">
            MindMonitor bridges these gaps with continuous IoT-driven sensor data.
          </p>
          <div className="h-8 w-px bg-linear-to-b from-white/20 to-transparent" />
        </motion.div>

      </div>
    </section>
  );
}
