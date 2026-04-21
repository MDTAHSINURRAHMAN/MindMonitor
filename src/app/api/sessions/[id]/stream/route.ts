import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialState, nextReading, toSensorReadingData } from '@/lib/fakeReading';

const INTERVAL_MS = 2500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  const session = await prisma.monitoringSession.findUnique({
    where: { id: sessionId },
    select: { patientId: true, status: true },
  });

  if (!session || session.status !== 'ACTIVE') {
    return new NextResponse('Session not found or not active', { status: 404 });
  }

  const { patientId } = session;
  const encoder = new TextEncoder();
  let cancelled = false;
  const state = initialState();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          cancelled = true;
        }
      };

      // Immediately tell the client we're connected
      send({ type: 'connected', sessionId });

      while (!cancelled) {
        await sleep(INTERVAL_MS);
        if (cancelled) break;

        // Check session is still ACTIVE
        const current = await prisma.monitoringSession.findUnique({
          where: { id: sessionId },
          select: { status: true },
        });

        if (!current || current.status !== 'ACTIVE') {
          send({ type: 'ended' });
          try { controller.close(); } catch { /* already closed */ }
          break;
        }

        const reading = nextReading(state, patientId, sessionId);

        // Persist reading to the SensorReading table
        try {
          await prisma.sensorReading.create({
            data: { patientId, ...toSensorReadingData(reading) },
          });
        } catch {
          // Don't abort the stream if a DB write fails
        }

        send({ type: 'reading', data: reading });
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
