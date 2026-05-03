'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, X, Loader2, Sparkles, MessageCircle,
  Activity, Send, RotateCcw, ChevronRight,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────────── */

interface Reading {
  heartRate?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  gsrRaw?: number | null;
  gsrBaseline?: number | null;
  gsrDiff?: number | null;
  stressScore?: number | null;
  stressLabel?: string | null;
  fingerDetected?: boolean | null;
  skinDetected?: boolean | null;
  status?: string | null;
  recordedAt?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  patientId: string;
}

type Tab = 'chat' | 'analyze';

const QUICK_PROMPTS = [
  'How can I reduce stress?',
  'What does my heart rate indicate?',
  'Tips for better sleep quality',
  'How to manage anxiety?',
];

/* ── Markdown renderer ────────────────────────────────────── */

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-[13px] text-white/80 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="text-[10px] font-bold uppercase tracking-widest text-violet-300 mt-3 mb-0.5 first:mt-0">
              {line.replace('## ', '')}
            </h3>
          );
        if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
          const inner = line.trim().slice(2, -2);
          const color =
            inner.includes('Urgent') ? 'text-red-400' :
            inner.includes('Concerning') ? 'text-amber-400' :
            inner.includes('Mild') ? 'text-yellow-300' : 'text-emerald-400';
          return <p key={i} className={`font-bold ${color}`}>{inner}</p>;
        }
        if (line.startsWith('- '))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400 shrink-0 mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

/* ── Reading row helper ───────────────────────────────────── */

function ReadingRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px] text-white/35">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/* ── Analyze tab ──────────────────────────────────────────── */

function AnalyzeTab({ patientId }: { patientId: string }) {
  const [fetching, setFetching] = useState(true);
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`/api/readings?patientId=${patientId}&range=24h`);
        if (!res.ok) return;
        const data: Reading[] = await res.json();
        setReading(data.at(-1) ?? null);
      } catch {
        // silently ignore — will show empty state
      } finally {
        setFetching(false);
      }
    }
    fetchLatest();
  }, [patientId]);

  useEffect(() => {
    if (analysis && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [analysis]);

  async function analyze() {
    if (!reading) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bpm: reading.heartRate,
          spo2: reading.spo2,
          temperature: reading.temperature,
          gsr: reading.gsrRaw,
          gsrBaseline: reading.gsrBaseline,
          gsrDiff: reading.gsrDiff,
          stressScore: reading.stressScore,
          stressLabel: reading.stressLabel,
          fingerDetected: reading.fingerDetected,
          skinDetected: reading.skinDetected,
          status: reading.status,
          recordedAt: reading.recordedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze reading.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col items-center gap-3 py-14">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
        <p className="text-[11px] text-white/30">Loading your latest reading…</p>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
          <Activity size={20} className="text-white/20" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/50">No Reading Available</p>
          <p className="mt-1 text-xs text-white/25 leading-relaxed">
            Start a monitoring session from the dashboard to capture sensor data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

        {!analysis && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/8 bg-white/4 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Latest Reading</p>
              {reading.recordedAt && (
                <p className="ml-auto text-[10px] text-white/20">
                  {new Date(reading.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="px-3 py-2.5 space-y-1">
              {reading.heartRate != null && <ReadingRow label="Heart Rate" value={`${reading.heartRate} bpm`} color="text-rose-400" />}
              {reading.spo2 != null && <ReadingRow label="SpO₂" value={`${reading.spo2.toFixed(1)}%`} color="text-sky-400" />}
              {reading.temperature != null && <ReadingRow label="Temperature" value={`${reading.temperature.toFixed(1)} °C`} color="text-orange-400" />}
              {reading.stressScore != null && <ReadingRow label="Stress Score" value={`${reading.stressScore}`} color="text-violet-400" />}
              {reading.stressLabel && <ReadingRow label="Stress Level" value={reading.stressLabel} color="text-amber-400" />}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
              <Brain size={14} className="text-violet-400" />
            </div>
            <p className="text-[11px] text-white/35">Analyzing your reading…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
        )}

        {analysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MarkdownText text={analysis} />
          </motion.div>
        )}
      </div>

      <div className="px-4 pb-4 pt-3 border-t border-white/8 shrink-0 space-y-2">
        {!analysis ? (
          <button
            onClick={analyze}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={13} className="animate-spin" /> Analyzing…</>
              : <><Sparkles size={13} /> Analyze My Reading</>}
          </button>
        ) : (
          <button
            onClick={() => { setAnalysis(null); setError(null); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12px] font-medium text-white/55 hover:bg-white/8 hover:text-white/75 transition-all active:scale-[0.98]"
          >
            <RotateCcw size={12} /> Analyze Again
          </button>
        )}
        <p className="text-center text-[10px] text-white/15">
          Not a medical diagnosis · Consult a doctor for clinical advice
        </p>
      </div>
    </div>
  );
}

/* ── Chat tab ─────────────────────────────────────────────── */

const WELCOME = "Hi! I'm your MindMonitor health assistant. I'm here to help with stress, mood, sleep, anxiety, and emotional wellbeing. How are you feeling today?";

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setShowPrompts(false);
    const userMsg: ChatMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 shrink-0 mt-0.5 rounded-xl bg-violet-600/25 border border-violet-500/25 flex items-center justify-center">
                <Brain size={12} className="text-violet-300" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600/85 text-white rounded-tr-sm shadow-md shadow-violet-900/20'
                  : 'bg-white/8 text-white/85 rounded-tl-sm border border-white/8'
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {showPrompts && messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-1.5"
          >
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/20 px-0.5 mb-0.5">
              Suggested
            </p>
            {QUICK_PROMPTS.map((q) => (
              <motion.button
                key={q}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.12 }}
                onClick={() => send(q)}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-left text-[12px] text-white/50 hover:bg-white/7 hover:text-white/75 hover:border-white/12 transition-all"
              >
                <ChevronRight size={11} className="text-violet-400 shrink-0" />
                {q}
              </motion.button>
            ))}
          </motion.div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 justify-start"
          >
            <div className="h-7 w-7 shrink-0 rounded-xl bg-violet-600/25 border border-violet-500/25 flex items-center justify-center">
              <Brain size={12} className="text-violet-300" />
            </div>
            <div className="bg-white/8 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2.5 border-t border-white/8 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-violet-500/50 focus-within:bg-white/7 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="How are you feeling today…"
            className="flex-1 resize-none bg-transparent text-[13px] text-white placeholder-white/20 outline-none max-h-24 leading-relaxed"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-lg bg-violet-600 p-2 text-white transition-all hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </motion.button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/15">
          Not a therapist · In crisis? Call emergency services
        </p>
      </div>
    </div>
  );
}

/* ── Tab button ───────────────────────────────────────────── */

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
        active ? 'text-violet-300' : 'text-white/35 hover:text-white/55'
      }`}
    >
      {active && (
        <motion.div
          layoutId="tab-bg"
          className="absolute inset-0 bg-violet-500/8"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      {active && (
        <motion.div
          layoutId="tab-line"
          className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-violet-400"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

/* ── Main component ───────────────────────────────────────── */

export function MindMonitorAI({ patientId }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <>
      {/* ── Floating trigger ── */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-950/90 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/5 hover:border-violet-500/30 transition-colors"
        aria-label="Open MindMonitor AI"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/8 to-transparent" />

        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
          <Brain size={15} className="text-violet-400" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-950" />
          </span>
        </div>

        <div className="hidden sm:flex flex-col text-left">
          <span className="text-[13px] font-semibold text-white leading-none">MindMonitor AI</span>
          <span className="text-[10px] text-emerald-400 font-medium leading-tight mt-0.5">Online · Health Assistant</span>
        </div>
        <span className="sm:hidden text-sm font-semibold text-white">AI</span>
      </motion.button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50"
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[390px] rounded-2xl border border-white/10 bg-gray-950/96 shadow-2xl shadow-black/70 backdrop-blur-2xl ring-1 ring-white/5 flex flex-col overflow-hidden"
              style={{ height: '540px' }}
            >
              {/* top gradient border */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

              {/* ── header ── */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30 shadow-lg shadow-violet-500/20">
                      <Brain size={16} className="text-violet-400" />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-gray-950" />
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white leading-tight">MindMonitor AI</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold text-emerald-400">● Online</span>
                        <span className="text-white/20 text-[10px]">·</span>
                        <span className="text-[10px] text-white/30">Health & Wellbeing</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-white/25 hover:text-white/65 hover:bg-white/8 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── tabs ── */}
              <div className="relative flex shrink-0 border-b border-white/8">
                <TabButton
                  active={tab === 'chat'}
                  onClick={() => setTab('chat')}
                  icon={<MessageCircle size={12} />}
                  label="Mental Health Chat"
                />
                <TabButton
                  active={tab === 'analyze'}
                  onClick={() => setTab('analyze')}
                  icon={<Sparkles size={12} />}
                  label="Analyze Reading"
                />
              </div>

              {/* ── tab content ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === 'chat' ? -6 : 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.13 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {tab === 'chat' ? <ChatTab /> : <AnalyzeTab patientId={patientId} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
