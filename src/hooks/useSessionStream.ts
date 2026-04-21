'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveReading } from '@/lib/fakeReading';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error';

export interface SessionStream {
  reading:      LiveReading | null;
  streamStatus: StreamStatus;
  readingCount: number;
}

export function useSessionStream(sessionId: string | null): SessionStream {
  const [reading,      setReading]      = useState<LiveReading | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [readingCount, setReadingCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Close any existing connection
    esRef.current?.close();
    esRef.current = null;

    if (!sessionId) {
      setStreamStatus('idle');
      setReading(null);
      setReadingCount(0);
      return;
    }

    setStreamStatus('connecting');

    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          data?: LiveReading;
          sessionId?: string;
        };

        if (payload.type === 'connected') {
          setStreamStatus('connected');
        } else if (payload.type === 'reading' && payload.data) {
          setReading(payload.data);
          setReadingCount((c) => c + 1);
        } else if (payload.type === 'ended') {
          setStreamStatus('ended');
          es.close();
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setStreamStatus('error');
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sessionId]);

  return { reading, streamStatus, readingCount };
}
