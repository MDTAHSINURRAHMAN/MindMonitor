import { NextRequest, NextResponse } from "next/server";
import dummyData from "../../../../bridge/dummy-sensor-data.json";

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

  // --- DUMMY MODE: serve data from local JSON, no DB required ---
  const raw = (dummyData.readings as Record<string, unknown>[]).filter(
    (r) => !("_scenario" in r) || r._scenario === undefined || true, // include all entries
  );

  const now = Date.now();
  const interval = rangeMs / raw.length;

  const readings = raw.map((r, i) => ({
    id:          `dummy-${i}`,
    recordedAt:  new Date(now - rangeMs + i * interval).toISOString(),
    patientId,
    stressLevel: r.stressLevel as number,
    stressLabel: r.stressLabel as string,
    gsrRaw:      r.gsrRaw as number,
    resistance:  r.resistance as number,
    temperature: r.temperature as number,
    heartRate:   (r.heartRate as number | undefined) ?? null,
    spo2:        (r.spo2 as number | undefined) ?? null,
  }));

  return NextResponse.json(readings);
}
