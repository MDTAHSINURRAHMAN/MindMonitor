'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveReading } from '@/lib/fakeReading';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error';

export interface SessionStream {
  reading:      LiveReading | null;
  streamStatus: StreamStatus;
  readingCount: number;
  lastPersistedTs: number | null;
}

type RawLiveReading = Partial<LiveReading> & {
  sensorId?: string;
  timeStampMs?: number;
};

function toLiveReading(raw: RawLiveReading, sessionId: string, fallbackPatientId = ''): LiveReading | null {
  const candidateTs =
    typeof raw.timestampMs === 'number'
      ? raw.timestampMs
      : typeof raw.timeStampMs === 'number'
        ? raw.timeStampMs
        : null;

  const timestampMs =
    candidateTs && candidateTs > 1_000_000_000_000 ? candidateTs : Date.now();

  // Use patientId from Firebase data; fall back to the known patient from the active session
  // when the ESP writes raw readings that don't include patientId.
  const patientId =
    typeof raw.patientId === 'string' && raw.patientId
      ? raw.patientId
      : fallbackPatientId;
  if (!patientId) return null;

  return {
    patientId,
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : sessionId,
    bpm: typeof raw.bpm === 'number' ? raw.bpm : 0,
    spo2: typeof raw.spo2 === 'number' ? raw.spo2 : 0,
    temperature: typeof raw.temperature === 'number' ? raw.temperature : 0,
    gsr: typeof raw.gsr === 'number' ? raw.gsr : 0,
    gsrBaseline: typeof raw.gsrBaseline === 'number' ? raw.gsrBaseline : 500,
    gsrDiff: typeof raw.gsrDiff === 'number' ? raw.gsrDiff : 0,
    ir: typeof raw.ir === 'number' ? raw.ir : 0,
    red: typeof raw.red === 'number' ? raw.red : 0,
    fingerDetected: Boolean(raw.fingerDetected),
    skinDetected: Boolean(raw.skinDetected),
    stressScore: typeof raw.stressScore === 'number' ? raw.stressScore : 0,
    status:
      raw.status === 'high' || raw.status === 'elevated' || raw.status === 'normal'
        ? raw.status
        : 'normal',
    timestampMs,
  };
}

export function useSessionStream(sessionId: string | null, patientId: string): SessionStream {
  const [reading,      setReading]      = useState<LiveReading | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [readingCount, setReadingCount] = useState(0);
  const [lastPersistedTs, setLastPersistedTs] = useState<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const lastSyncedTsRef = useRef<number | null>(null);

  const persistReading = useCallback(async (value: LiveReading, currentSessionId: string) => {
    const ts = typeof value.timestampMs === 'number' ? value.timestampMs : Date.now();

    if (lastSyncedTsRef.current === ts) {
      return;
    }

    lastSyncedTsRef.current = ts;
    void fetch('/api/readings/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        sessionId: currentSessionId,
        reading: {
          // Always use the hook-level patientId so ESP readings (which omit patientId
          // in their Firebase payload) are attributed to the correct patient.
          patientId,
          sessionId: currentSessionId,
          bpm: value.bpm,
          gsr: value.gsr,
          gsrBaseline: value.gsrBaseline,
          gsrDiff: value.gsrDiff,
          ir: value.ir,
          red: value.red,
          spo2: value.spo2,
          fingerDetected: value.fingerDetected,
          skinDetected: value.skinDetected,
          status: value.status,
          stressScore: value.stressScore,
          temperature: value.temperature,
          timestampMs: value.timestampMs,
        },
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { inserted?: boolean };
        if (payload.inserted) {
          setLastPersistedTs(ts);
        }
      })
      .catch(() => {
        // Ignore transient ingest failures; the Firebase stream should stay active.
      });
  }, [patientId]);

  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    lastTsRef.current = null;
    lastSyncedTsRef.current = null;

    if (!sessionId) {
      setStreamStatus('idle');
      setReading(null);
      setReadingCount(0);
      setLastPersistedTs(null);
      return;
    }

    setStreamStatus('connecting');
    const currentSessionId = sessionId;

    let active = true;

    async function subscribe() {
      try {
        const [{ rtdb }, { ref, onValue, onChildAdded }] = await Promise.all([
          import('@/lib/firebase'),
          import('firebase/database'),
        ]);

        if (!active) return;

        const dataRef = ref(rtdb, `/live/current/${currentSessionId}`);
        unsubRef.current = onValue(
          dataRef,
          (snap) => {
            if (!active) return;

            const raw = snap.val() as RawLiveReading | null;
            if (!raw) {
              return;
            }

            const value = toLiveReading(raw, currentSessionId, patientId);
            if (!value || value.patientId !== patientId) {
              return;
            }

            setReading(value);
            setStreamStatus('connected');

            const ts = typeof value.timestampMs === 'number' ? value.timestampMs : Date.now();
            if (lastTsRef.current !== ts) {
              setReadingCount((c) => c + 1);
              lastTsRef.current = ts;

              // Push to server so Firebase arrivals are inserted into Prisma/Supabase immediately.
              void persistReading(value, currentSessionId);
            }
          },
          () => {
            if (!active) return;
            setStreamStatus('error');
          },
        );

        const historyRef = ref(rtdb, `/history/readings/${currentSessionId}`);
        onChildAdded(historyRef, (snap) => {
          if (!active) return;

          const raw = snap.val() as Partial<LiveReading> | null;
          if (!raw) return;

          const value = toLiveReading(raw, currentSessionId, patientId);
          if (!value || value.patientId !== patientId) return;

          void persistReading(value, currentSessionId);
        });
      } catch {
        if (!active) return;
        setStreamStatus('error');
      }
    }

    subscribe();

    return () => {
      active = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [patientId, persistReading, sessionId]);

  return { reading, streamStatus, readingCount, lastPersistedTs };
}
