'use client';

import { useEffect, useState } from 'react';

export interface LiveReading {
  patientId: string;
  sessionId: string;
  deviceId: string;
  bpm: number;
  fingerDetected: boolean;
  gsr: number;
  gsrBaseline: number;
  gsrDiff: number;
  ir: number;
  red: number;
  skinDetected: boolean;
  spo2: number;
  status: string;
  stressScore: number;
  temperature: number;
  timestampMs: number;
}

// Dummy readings that rotate to simulate live sensor data
const DUMMY_BASE: Omit<LiveReading, 'bpm' | 'gsr' | 'gsrDiff' | 'stressScore' | 'temperature' | 'spo2' | 'timestampMs'> = {
  patientId: 'patient_123',
  sessionId: 'session_001',
  deviceId: 'esp_01',
  fingerDetected: true,
  gsrBaseline: 500,
  ir: 12000,
  red: 11000,
  skinDetected: true,
  status: 'normal',
};

function randomBetween(min: number, max: number, decimals = 0) {
  const val = Math.random() * (max - min) + min;
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
}

function generateDummyReading(sessionId: string, patientId: string): LiveReading {
  const gsr = randomBetween(480, 540);
  const gsrBaseline = 500;
  return {
    ...DUMMY_BASE,
    sessionId,
    patientId,
    bpm: randomBetween(65, 95),
    gsr,
    gsrBaseline,
    gsrDiff: gsr - gsrBaseline,
    spo2: randomBetween(96, 100, 1),
    stressScore: randomBetween(10, 60),
    temperature: randomBetween(36.2, 37.4, 1),
    timestampMs: Date.now(),
    status: gsr - gsrBaseline > 25 ? 'elevated' : 'normal',
  };
}

interface Options {
  sessionId: string;
  patientId: string;
  /** poll interval ms — only used in dummy mode. Default 3000 */
  interval?: number;
}

export function useLiveSession({ sessionId, patientId, interval = 3000 }: Options) {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let rtdbUnsub: (() => void) | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    async function attachFirebase() {
      try {
        const { rtdb } = await import('@/lib/firebase');
        const { ref, onValue } = await import('firebase/database');

        const dataRef = ref(rtdb, `/live/current/${sessionId}`);
        rtdbUnsub = onValue(
          dataRef,
          (snap) => {
            if (!mounted) return;
            const val = snap.val() as LiveReading | null;
            if (val) {
              setReading(val);
              setConnected(true);
            }
          },
          () => {
            // Firebase failed — fall through to dummy mode
            startDummyMode();
          }
        );
      } catch {
        startDummyMode();
      }
    }

    function startDummyMode() {
      if (!mounted) return;
      setReading(generateDummyReading(sessionId, patientId));
      setConnected(true);
      timer = setInterval(() => {
        if (mounted) setReading(generateDummyReading(sessionId, patientId));
      }, interval);
    }

    // Try Firebase first; fall back to dummy after 4 s if no data arrives
    attachFirebase();
    const fallbackTimer = setTimeout(() => {
      if (mounted && !reading) startDummyMode();
    }, 4000);

    return () => {
      mounted = false;
      rtdbUnsub?.();
      if (timer) clearInterval(timer);
      clearTimeout(fallbackTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, patientId, interval]);

  return { reading, connected };
}
