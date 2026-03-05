'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useAnimationFrame } from 'framer-motion';
import { Activity, Brain, Thermometer, Wind } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Helpers – lightweight animated number ticker
// ─────────────────────────────────────────────────────────────
function useLiveValue(base: number, variance: number, interval = 1600) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const id = setInterval(
      () => setVal(+(base + (Math.random() - 0.5) * 2 * variance).toFixed(1)),
      interval,
    );
    return () => clearInterval(id);
  }, [base, variance, interval]);
  return val;
}

// ─────────────────────────────────────────────────────────────
// Animated sparkline canvas
// ─────────────────────────────────────────────────────────────
function Sparkline({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[] | null>(null);
  if (historyRef.current === null) {
    historyRef.current = Array.from({ length: 30 }, (_, i) => (i * 0.618034) % 1);
  }

  useAnimationFrame(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // push new point
    historyRef.current!.push((historyRef.current!.length * 0.61803) % 1 + Math.sin(Date.now() / 800) * 0.3 + 0.5);
    if (historyRef.current!.length > 30) historyRef.current!.shift();

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = historyRef.current!;
    const step = w / (data.length - 1);

    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(0, h - data[0] * h * 0.7 - h * 0.15);
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i * step, h - data[i] * h * 0.7 - h * 0.15);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(0, h - data[0] * h * 0.7 - h * 0.15);
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i * step, h - data[i] * h * 0.7 - h * 0.15);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={36}
      className="w-full opacity-80"
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Individual metric card
// ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;          // hex
  tailwindRing: string;   // e.g. "ring-rose-500/30"
  statusLabel: string;
  statusColor: string;    // tailwind text color
  delay: number;
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  color,
  tailwindRing,
  statusLabel,
  statusColor,
  delay,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={`
        relative overflow-hidden rounded-2xl p-4
        bg-white/5 backdrop-blur-md
        border border-white/10
        ring-1 ${tailwindRing}
        hover:bg-white/8 transition-colors duration-300
      `}
    >
      {/* blurred glow blob behind the card */}
      <div
        className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-30"
        style={{ background: color }}
      />

      {/* header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
            {label}
          </span>
        </div>
        <span className={`text-[10px] font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* value */}
      <div className="mb-2 flex items-baseline gap-1">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold text-white tabular-nums"
        >
          {unit === '%' || unit === 'bpm' ? Math.round(value) : value}
        </motion.span>
        <span className="text-xs text-white/40">{unit}</span>
      </div>

      {/* sparkline */}
      <Sparkline color={color} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating orb background element
// ─────────────────────────────────────────────────────────────
function FloatingOrb({
  style,
  delay,
}: {
  style: React.CSSProperties;
  delay: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={style}
      animate={{ y: [0, -24, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 7, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Main Hero Section
// ─────────────────────────────────────────────────────────────
export function HeroSection() {
  const heartRate = useLiveValue(74, 4);
  const stress    = useLiveValue(42, 6);
  const temp      = useLiveValue(36.8, 0.3);
  const spo2      = useLiveValue(97, 1.5);

  const metrics: MetricCardProps[] = [
    {
      icon: <Activity size={14} strokeWidth={2.5} />,
      label: 'Heart Rate',
      value: heartRate,
      unit: 'bpm',
      color: '#f43f5e',
      tailwindRing: 'ring-rose-500/30',
      statusLabel: 'NORMAL',
      statusColor: 'text-emerald-400',
      delay: 0.55,
    },
    {
      icon: <Brain size={14} strokeWidth={2.5} />,
      label: 'Stress Level',
      value: stress,
      unit: '%',
      color: '#a855f7',
      tailwindRing: 'ring-purple-500/30',
      statusLabel: stress > 60 ? 'HIGH' : 'MODERATE',
      statusColor: stress > 60 ? 'text-rose-400' : 'text-amber-400',
      delay: 0.65,
    },
    {
      icon: <Thermometer size={14} strokeWidth={2.5} />,
      label: 'Temperature',
      value: temp,
      unit: '°C',
      color: '#f97316',
      tailwindRing: 'ring-orange-500/30',
      statusLabel: 'NORMAL',
      statusColor: 'text-emerald-400',
      delay: 0.75,
    },
    {
      icon: <Wind size={14} strokeWidth={2.5} />,
      label: 'SpO₂',
      value: spo2,
      unit: '%',
      color: '#38bdf8',
      tailwindRing: 'ring-sky-500/30',
      statusLabel: Math.round(spo2) >= 95 ? 'NORMAL' : 'LOW',
      statusColor: Math.round(spo2) >= 95 ? 'text-emerald-400' : 'text-rose-400',
      delay: 0.85,
    },
  ];

  return (
    <section className="relative isolate flex min-h-[calc(100vh-64px)] w-full flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 py-24">

      {/* ── background orbs ── */}
      <FloatingOrb
        style={{ width: 480, height: 480, top: '-10%', left: '-8%', background: 'rgba(139,92,246,0.18)' }}
        delay={0}
      />
      <FloatingOrb
        style={{ width: 360, height: 360, bottom: '5%', right: '-6%', background: 'rgba(56,189,248,0.14)' }}
        delay={2}
      />
      <FloatingOrb
        style={{ width: 280, height: 280, top: '30%', right: '10%', background: 'rgba(244,63,94,0.1)' }}
        delay={4}
      />

      {/* ── subtle grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── content wrapper ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-12">

        {/* ── LEFT: copy ── */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">

          {/* badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            IoT-Powered Health Intelligence
          </motion.div>

          {/* headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
          >
            Continuous Mental Health{' '}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
              Monitoring
            </span>{' '}
            Powered by{' '}
            <span className="bg-linear-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
              IoT
            </span>
          </motion.h1>

          {/* subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mb-10 max-w-lg text-base leading-relaxed text-white/55 sm:text-lg"
          >
            A smart healthcare platform that uses physiological sensors, cloud
            analytics, and real-time dashboards to monitor stress indicators
            and support early mental health intervention.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Link
              href="/dashboard"
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-violet-600 to-fuchsia-600 px-7 text-sm font-semibold text-white shadow-lg shadow-violet-700/30 transition-all duration-300 hover:shadow-violet-600/50 hover:brightness-110 active:scale-95"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <Activity size={16} strokeWidth={2.5} />
              View Dashboard
            </Link>

            <a
              href="#features"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
            >
              Learn More
            </a>
          </motion.div>

          {/* trust stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 lg:justify-start"
          >
            {[
              { value: '< 2s', label: 'Reading Latency' },
              { value: '24 / 7', label: 'Live Monitoring' },
              { value: '4+', label: 'Sensor Metrics' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center lg:items-start">
                <span className="text-xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT: live dashboard cards ── */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="relative flex w-full max-w-sm flex-col gap-3 lg:max-w-xs xl:max-w-sm"
        >
          {/* dashboard header bar */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20">
                <Activity size={12} className="text-violet-400" />
              </span>
              <span className="text-sm font-semibold text-white/80">MindMonitor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">LIVE</span>
            </div>
          </div>

          {/* metric cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>

          {/* bottom summary bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md"
          >
            <span className="text-xs text-white/40">Overall Status</span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
              Stable
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
