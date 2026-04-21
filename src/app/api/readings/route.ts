import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncFirebaseReadingsForPatient } from "@/lib/firebaseReadingsSync";

const RANGE_MS: Record<string, number> = {
  "24h":  86_400_000,
  "7d":   7  * 86_400_000,
  "30d":  30 * 86_400_000,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const patientId = searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const range = searchParams.get("range") ?? "24h";
  const rangeMs = RANGE_MS[range];
  if (!rangeMs) {
    return NextResponse.json(
      { error: "range must be one of: 24h, 7d, 30d" },
      { status: 400 },
    );
  }

  try {
    await syncFirebaseReadingsForPatient(patientId);
  } catch {
    // If sync fails, still return existing DB records.
  }

  const since = new Date(Date.now() - rangeMs);
  const readings = await prisma.sensorReading.findMany({
    where: { patientId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
    select: {
      id: true,
      patientId: true,
      sessionId: true,
      deviceId: true,
      recordedAt: true,
      stressLevel: true,
      stressLabel: true,
      stressScore: true,
      status: true,
      gsrRaw: true,
      gsrBaseline: true,
      gsrDiff: true,
      ir: true,
      red: true,
      fingerDetected: true,
      skinDetected: true,
      sourceTimestampMs: true,
      resistance: true,
      temperature: true,
      heartRate: true,
      spo2: true,
    },
  });

  return NextResponse.json(
    readings.map((r) => ({
      ...r,
      recordedAt: r.recordedAt.toISOString(),
      heartRate: r.heartRate ?? null,
      spo2: r.spo2 ?? null,
      sourceTimestampMs: r.sourceTimestampMs != null ? r.sourceTimestampMs.toString() : null,
    })),
  );
}
