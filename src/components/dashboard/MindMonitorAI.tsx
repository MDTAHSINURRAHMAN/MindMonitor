'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Brain, X, Loader2, Sparkles, MessageCircle,
  Activity, Send, RotateCcw,
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
  latestReading: Reading | null;
}

type Tab = 'chat' | 'analyze';

/* ── Markdown renderer ────────────────────────────────────── */

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm text-white/80 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="text-[11px] font-bold uppercase tracking-wider text-violet-300 mt-3 mb-0.5 first:mt-0">
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

/* ── Analyze tab ──────────────────────────────────────────── */

function AnalyzeTab({ latestReading }: { latestReading: Reading | null }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysis && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [analysis]);

  async function analyze() {
    if (!latestReading) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bpm: latestReading.heartRate,
          spo2: latestReading.spo2,
          temperature: latestReading.temperature,
          gsr: latestReading.gsrRaw,
          gsrBaseline: latestReading.gsrBaseline,
          gsrDiff: latestReading.gsrDiff,
          stressScore: latestReading.stressScore,
          stressLabel: latestReading.stressLabel,
          fingerDetected: latestReading.fingerDetected,
          skinDetected: latestReading.skinDetected,
          status: latestReading.status,
          recordedAt: latestReading.recordedAt,
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

  if (!latestReading)
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Activity size={20} className="text-white/20" />
        <p className="text-xs text-white/40">No sensor reading available yet.<br />Start a monitoring session first.</p>
      </div>
    );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Reading preview */}
      {!analysis && !loading && (
        <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 space-y-1.5 mx-4 mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Latest Reading</p>
          {latestReading.heartRate != null && <Row label="Heart Rate" value={`${latestReading.heartRate} bpm`} />}
          {latestReading.spo2 != null && <Row label="SpO₂" value={`${latestReading.spo2?.toFixed(1)}%`} />}
          {latestReading.temperature != null && <Row label="Temperature" value={`${latestReading.temperature?.toFixed(1)}°C`} />}
          {latestReading.stressScore != null && <Row label="Stress Score" value={`${latestReading.stressScore}`} />}
          {latestReading.stressLabel && <Row label="Stress Level" value={latestReading.stressLabel} />}
          {latestReading.recordedAt && (
            <Row label="Recorded" value={new Date(latestReading.recordedAt).toLocaleTimeString()} />
          )}
        </div>
      )}

      {/* Result or states */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={20} className="animate-spin text-violet-400" />
            <p className="text-xs text-white/40">Analyzing your reading…</p>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
        )}
        {analysis && <MarkdownText text={analysis} />}
      </div>

      {/* Action */}
      <div className="px-4 pb-4 pt-2 border-t border-white/8 shrink-0">
        {!analysis ? (
          <button
            onClick={analyze}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 size={13} className="animate-spin" /> Analyzing…</> : <><Sparkles size={13} /> Analyze My Reading</>}
          </button>
        ) : (
          <button
            onClick={() => { setAnalysis(null); setError(null); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white/60 hover:bg-white/8 hover:text-white/80 transition-all"
          >
            <RotateCcw size={12} /> Analyze Again
          </button>
        )}
        <p className="mt-2 text-center text-[10px] text-white/20">Not a medical diagnosis · Consult a doctor</p>
      </div>
    </div>
  );
}

/* ── Chat tab ─────────────────────────────────────────────── */

const WELCOME = "Hi! I'm your MindMonitor mental health assistant. I'm here to support you with stress, mood, sleep, anxiety, and emotional wellbeing. How are you feeling today?";

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
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
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="h-6 w-6 shrink-0 mt-0.5 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
                <Brain size={11} className="text-violet-300" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600/80 text-white rounded-tr-sm'
                  : 'bg-white/8 text-white/85 rounded-tl-sm border border-white/8'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="h-6 w-6 shrink-0 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center">
              <Brain size={11} className="text-violet-300" />
            </div>
            <div className="bg-white/8 border border-white/8 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/8 shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-violet-500/50 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="How are you feeling…"
            className="flex-1 resize-none bg-transparent text-xs text-white placeholder-white/25 outline-none max-h-20 leading-relaxed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-lg bg-violet-600 p-1.5 text-white transition-all hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-white/20">Not a therapist · In crisis? Call emergency services</p>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */

export function MindMonitorAI({ latestReading }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 backdrop-blur-md transition-all hover:bg-violet-500 hover:scale-105 active:scale-95"
        aria-label="Open MindMonitor AI"
      >
        <Brain size={16} />
        <span className="hidden sm:inline">MindMonitor AI</span>
        <span className="inline sm:hidden">AI</span>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-200" />
      </button>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
          {/* Backdrop */}
          <div className="absolute inset-0 pointer-events-auto" onClick={() => setOpen(false)} />

          <div className="relative pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-gray-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl flex flex-col"
            style={{ height: '520px' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/30 border border-violet-500/30">
                  <Brain size={13} className="text-violet-300" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">MindMonitor AI</p>
                  <p className="text-[10px] text-white/40">Your health & wellbeing assistant</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-white/8">
              <TabButton
                active={tab === 'chat'}
                onClick={() => setTab('chat')}
                icon={<MessageCircle size={12} />}
                label="Mental Health Chat"
              />
              <TabButton
                active={tab === 'analyze'}
                onClick={() => setTab('analyze')}
                icon={<Activity size={12} />}
                label="Reading Analysis"
              />
            </div>

            {/* Tab content */}
            {tab === 'chat' ? <ChatTab /> : <AnalyzeTab latestReading={latestReading} />}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Small helpers ────────────────────────────────────────── */

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
      className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${
        active
          ? 'border-violet-400 text-violet-300'
          : 'border-transparent text-white/40 hover:text-white/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-[11px] font-medium text-white/70">{value}</span>
    </div>
  );
}
