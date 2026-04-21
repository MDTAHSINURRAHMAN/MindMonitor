import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  ingestFirebaseReadingForPatient,
  type RawFirebaseReading,
} from '@/lib/firebaseReadingsSync';

const IngestSchema = z.object({
  patientId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  reading: z
    .object({
      patientId: z.string().optional(),
      sessionId: z.string().optional(),
      deviceId: z.string().optional(),
      bpm: z.number().optional(),
      gsr: z.number().optional(),
      gsrBaseline: z.number().optional(),
      gsrDiff: z.number().optional(),
      ir: z.number().optional(),
      red: z.number().optional(),
      spo2: z.number().optional(),
      fingerDetected: z.boolean().optional(),
      skinDetected: z.boolean().optional(),
      status: z.string().optional(),
      stressScore: z.number().optional(),
      temperature: z.number().optional(),
      timestampMs: z.number().optional(),
      timeStampMs: z.number().optional(),
      recordedAt: z.string().optional(),
    })
    .passthrough(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = IngestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { patientId, sessionId, reading } = parsed.data;

  // Only accept ingestion while the patient currently has an active monitoring session.
  const activeSession = await prisma.monitoringSession.findFirst({
    where: { patientId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });

  if (!activeSession) {
    return NextResponse.json({ error: 'No active monitoring session for this patient' }, { status: 409 });
  }

  const readingSessionId = reading.sessionId ?? sessionId;
  if (readingSessionId && readingSessionId !== activeSession.id) {
    return NextResponse.json({ error: 'Session mismatch for active monitoring session' }, { status: 409 });
  }

  const payload: RawFirebaseReading = {
    ...reading,
    patientId,
    sessionId: activeSession.id,
  };

  const result = await ingestFirebaseReadingForPatient(payload, patientId);
  return NextResponse.json({ inserted: result.inserted }, { status: 200 });
}
