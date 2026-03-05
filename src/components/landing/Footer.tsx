'use client';

import { motion } from 'framer-motion';
import { Activity, BrainCircuit, Mail, MapPin } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Problem',  href: '#problem'  },
  { label: 'Solution', href: '#solution' },
  { label: 'Features', href: '#features' },
  { label: 'Why It Matters', href: '#why' },
  { label: 'Dashboard', href: '/dashboard' },
] as const;

const TECH_ITEMS = [
  'Arduino & ESP8266',
  'FastAPI Backend',
  'PostgreSQL + TimescaleDB',
  'Next.js Dashboard',
  'Real-Time IoT Pipeline',
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-white/[0.07] bg-gray-950">

      {/* subtle top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.5) 35%, rgba(56,189,248,0.5) 65%, transparent 100%)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16">

        {/* ── top grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4"
        >

          {/* brand column */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {/* logo row */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-500/30">
                <Activity size={15} strokeWidth={2.2} className="text-violet-400" />
              </div>
              <span className="text-sm font-bold tracking-wide text-white">MindMonitor</span>
            </div>

            {/* full project name */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">
                Project
              </p>
              <p className="text-base font-semibold text-white/85 leading-snug">
                Mental Health Monitoring System
              </p>
            </div>

            {/* description */}
            <p className="max-w-xs text-sm leading-relaxed text-white/40">
              An IoT-powered platform for continuous physiological monitoring
              and mental health analysis — bridging the gap between sensor data
              and clinical insight.
            </p>

            {/* affiliation */}
            <div className="flex items-start gap-2 text-xs text-white/35">
              <MapPin size={12} strokeWidth={1.8} className="mt-0.5 shrink-0 text-violet-400" />
              <span>
                Khulna University of Engineering &amp; Technology (KUET)
                <br />
                Khulna, Bangladesh
              </span>
            </div>

            {/* contact */}
            <a
              href="mailto:contact@mindmonitor.dev"
              className="inline-flex items-center gap-2 text-xs text-white/35 transition-colors duration-200 hover:text-violet-300 w-fit"
            >
              <Mail size={12} strokeWidth={1.8} className="shrink-0" />
              contact@mindmonitor.dev
            </a>
          </div>

          {/* navigation column */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Navigation
            </p>
            <ul className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/45 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* tech stack column */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Built With
            </p>
            <ul className="flex flex-col gap-3">
              {TECH_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/45">
                  <span className="h-1 w-1 rounded-full bg-violet-500/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* ── divider ── */}
        <div className="my-10 h-px bg-white/6" />

        {/* ── bottom bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center justify-between gap-4 sm:flex-row"
        >
          <div className="flex items-center gap-2 text-xs text-white/25">
            <BrainCircuit size={12} strokeWidth={1.8} className="text-violet-500/60" />
            <span>
              &copy; {year} Mental Health Monitoring System — KUET. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-white/20">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>System online</span>
          </div>
        </motion.div>

      </div>
    </footer>
  );
}
