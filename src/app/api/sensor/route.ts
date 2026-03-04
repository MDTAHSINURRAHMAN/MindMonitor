import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SensorSchema = z.object({
  patientId:   z.string(),
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

  // --- DUMMY MODE: skip DB write and anomaly DB queries ---
  const dummyId = `dummy-${Date.now()}`;
  return NextResponse.json({ id: dummyId }, { status: 201 });
}
