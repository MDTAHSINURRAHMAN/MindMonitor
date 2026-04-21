import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rtdbPatch, rtdbPost } from "@/lib/firebaseRtdbServer";

const SensorSchema = z.object({
  patientId:   z.string(),
  sessionId:   z.string().optional(),
  deviceId:    z.string().optional(),
  gsrRaw:      z.number().int().min(0).max(1023),
  resistance:  z.number().positive(),
  stressLevel: z.number().int().min(1).max(3),
  stressLabel: z.string(),
  temperature: z.number().min(34).max(42),
  heartRate:   z.number().int().optional(),
  spo2:        z.number().optional(),
});

export async function POST(req: NextRequest) {
  // Validate API key (Arduino / bridge authentication)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ARDUINO_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SensorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const activeSession = data.sessionId
    ? await prisma.monitoringSession.findFirst({
        where: {
          id: data.sessionId,
          patientId: data.patientId,
          status: "ACTIVE",
        },
      })
    : await prisma.monitoringSession.findFirst({
        where: { patientId: data.patientId, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });

  if (!activeSession) {
    return NextResponse.json(
      { error: "No active monitoring session for this patient" },
      { status: 409 },
    );
  }

  const readingData = {
    patientId: data.patientId,
    sessionId: activeSession.id,
    deviceId: data.deviceId ?? activeSession.deviceId ?? 'sensor-bridge',
    gsrRaw: data.gsrRaw,
    resistance: data.resistance,
    stressLevel: data.stressLevel,
    stressLabel: data.stressLabel,
    temperature: data.temperature,
    heartRate: data.heartRate ?? null,
    spo2: data.spo2 ?? null,
    gsrBaseline: 500,
    gsrDiff: data.gsrRaw - 500,
    ir: 0,
    red: 0,
    fingerDetected: true,
    skinDetected: true,
    stressScore:
      data.stressLevel >= 3 ? 85 : data.stressLevel === 2 ? 50 : 20,
    status:
      data.stressLevel >= 3 ? 'high' : data.stressLevel === 2 ? 'elevated' : 'normal',
    sourceTimestampMs: BigInt(Date.now()),
  };

  const reading = await prisma.sensorReading.create({ data: readingData });

  const stressScore = readingData.stressScore;
  const status = readingData.status;

  const livePayload = {
    patientId: data.patientId,
    sessionId: activeSession.id,
    deviceId: data.deviceId ?? activeSession.deviceId ?? "sensor-bridge",
    bpm: data.heartRate ?? 0,
    spo2: data.spo2 ?? 0,
    temperature: data.temperature,
    gsr: data.gsrRaw,
    gsrBaseline: 500,
    gsrDiff: data.gsrRaw - 500,
    ir: 0,
    red: 0,
    fingerDetected: true,
    skinDetected: true,
    stressScore,
    status,
    timestampMs: reading.recordedAt.getTime(),
  };

  try {
    await rtdbPatch(`live/current/${activeSession.id}`, livePayload);
    await rtdbPost(`history/readings/${activeSession.id}`, {
      ...livePayload,
      recordedAt: reading.recordedAt.toISOString(),
    });
  } catch {
    // Firebase sync is best-effort; DB write has already succeeded.
  }

  return NextResponse.json({ id: reading.id, sessionId: activeSession.id }, { status: 201 });
}
