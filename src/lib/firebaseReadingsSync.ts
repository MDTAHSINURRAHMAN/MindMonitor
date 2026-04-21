import { prisma } from '@/lib/prisma';
import { rtdbGet } from '@/lib/firebaseRtdbServer';

export type RawFirebaseReading = {
  bpm?: number | string;
  deviceId?: string;
  fingerDetected?: boolean | string | number;
  gsr?: number | string;
  gsrBaseline?: number | string;
  gsrDiff?: number | string;
  ir?: number | string;
  patientId?: string;
  red?: number | string;
  sessionId?: string;
  skinDetected?: boolean | string | number;
  spo2?: number | string;
  status?: string;
  stressScore?: number | string;
  temperature?: number | string;
  timestampMs?: number | string;
  timeStampMs?: number | string;
  recordedAt?: string;
};

type HistoryNode = Record<string, Record<string, RawFirebaseReading> | null>;
type LiveNode = Record<string, RawFirebaseReading | null>;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toDate(value: RawFirebaseReading): Date | null {
  const ts = toNumber(value.timeStampMs ?? value.timestampMs);
  if (ts && ts > 0) {
    // ESP8266 may send uptime milliseconds instead of Unix epoch milliseconds.
    if (ts < 1_000_000_000_000) {
      return new Date();
    }
    return new Date(ts);
  }

  if (value.recordedAt) {
    const parsed = new Date(value.recordedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function stressLevelFromRaw(raw: RawFirebaseReading): number {
  const score = toNumber(raw.stressScore);
  if (score !== null) {
    if (score > 60) return 3;
    if (score > 30) return 2;
    return 1;
  }

  const status = (raw.status ?? '').toLowerCase();
  if (status.includes('high')) return 3;
  if (status.includes('elevated')) return 2;
  return 1;
}

function stressLabelFromLevel(level: number): string {
  if (level >= 3) return 'High Stress';
  if (level === 2) return 'Slightly Stressed';
  return 'Normal';
}

function resistanceFromRaw(raw: RawFirebaseReading, gsrRaw: number): number {
  const baseline = toNumber(raw.gsrBaseline) ?? 500;
  const safeGsr = Math.max(1, gsrRaw);
  const approx = ((baseline - safeGsr) / safeGsr) * 100;
  return Number.isFinite(approx) ? Number(approx.toFixed(2)) : 0;
}

function makeDedupKey(input: {
  recordedAt: Date;
  gsrRaw: number;
  temperature: number;
  heartRate: number | null;
  spo2: number | null;
  stressLevel: number;
}): string {
  const second = Math.floor(input.recordedAt.getTime() / 1000);
  const temp10 = Math.round(input.temperature * 10);
  const spo210 = input.spo2 == null ? -1 : Math.round(input.spo2 * 10);
  const hr = input.heartRate ?? -1;
  return [second, input.gsrRaw, temp10, hr, spo210, input.stressLevel].join('|');
}

export function normaliseFirebaseReading(raw: RawFirebaseReading, patientId: string) {
  // Reject only when patientId is explicitly present but belongs to a different patient.
  // If the ESP omits patientId entirely we accept the reading and attribute it to the
  // patient whose session context we're operating in.
  if (raw.patientId && raw.patientId !== patientId) return null;

  const recordedAt = toDate(raw);
  if (!recordedAt) return null;

  const gsrRaw = toNumber(raw.gsr);
  const temperature = toNumber(raw.temperature);
  if (gsrRaw === null || temperature === null) return null;

  const heartRateValue = toNumber(raw.bpm);
  const spo2Value = toNumber(raw.spo2);
  const gsrBaseline = toNumber(raw.gsrBaseline);
  const gsrDiff = toNumber(raw.gsrDiff);
  const ir = toNumber(raw.ir);
  const red = toNumber(raw.red);
  const stressScore = toNumber(raw.stressScore);
  const sourceTs = toNumber(raw.timeStampMs ?? raw.timestampMs);
  const stressLevel = stressLevelFromRaw(raw);

  return {
    patientId,
    sessionId: raw.sessionId ?? null,
    deviceId: raw.deviceId ?? null,
    recordedAt,
    gsrRaw: Math.max(0, Math.round(gsrRaw)),
    resistance: resistanceFromRaw(raw, gsrRaw),
    stressLevel,
    stressLabel: stressLabelFromLevel(stressLevel),
    temperature,
    heartRate: heartRateValue === null ? null : Math.round(heartRateValue),
    spo2: spo2Value,
    gsrBaseline: gsrBaseline === null ? null : Math.round(gsrBaseline),
    gsrDiff: gsrDiff === null ? null : Math.round(gsrDiff),
    ir: ir === null ? null : Math.round(ir),
    red: red === null ? null : Math.round(red),
    fingerDetected: toBoolean(raw.fingerDetected),
    skinDetected: toBoolean(raw.skinDetected),
    stressScore: stressScore === null ? null : Math.round(stressScore),
    status: raw.status ?? null,
    sourceTimestampMs: sourceTs && sourceTs > 0 ? BigInt(Math.floor(sourceTs)) : null,
  };
}

export async function ingestFirebaseReadingForPatient(
  raw: RawFirebaseReading,
  patientId: string,
): Promise<{ inserted: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!user) return { inserted: false };

  const mapped = normaliseFirebaseReading(raw, patientId);
  if (!mapped) return { inserted: false };

  const existing = await prisma.sensorReading.findMany({
    where: {
      patientId,
      recordedAt: {
        gte: new Date(mapped.recordedAt.getTime() - 1000),
        lte: new Date(mapped.recordedAt.getTime() + 1000),
      },
    },
    select: {
      recordedAt: true,
      gsrRaw: true,
      temperature: true,
      heartRate: true,
      spo2: true,
      stressLevel: true,
    },
  });

  const incomingKey = makeDedupKey(mapped);
  const alreadyExists = existing.some((item) =>
    makeDedupKey({
      recordedAt: item.recordedAt,
      gsrRaw: item.gsrRaw,
      temperature: item.temperature,
      heartRate: item.heartRate,
      spo2: item.spo2,
      stressLevel: item.stressLevel,
    }) === incomingKey,
  );

  if (alreadyExists) return { inserted: false };

  await prisma.sensorReading.create({ data: mapped });
  return { inserted: true };
}

export async function syncFirebaseReadingsForPatient(patientId: string): Promise<{ inserted: number }> {
  const user = await prisma.user.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!user) return { inserted: 0 };

  const [history, live] = await Promise.all([
    rtdbGet<HistoryNode>('history/readings'),
    rtdbGet<LiveNode>('live/current'),
  ]);

  const incoming: Array<{
    patientId: string;
    sessionId: string | null;
    deviceId: string | null;
    recordedAt: Date;
    gsrRaw: number;
    resistance: number;
    stressLevel: number;
    stressLabel: string;
    temperature: number;
    heartRate: number | null;
    spo2: number | null;
    gsrBaseline: number | null;
    gsrDiff: number | null;
    ir: number | null;
    red: number | null;
    fingerDetected: boolean | null;
    skinDetected: boolean | null;
    stressScore: number | null;
    status: string | null;
    sourceTimestampMs: bigint | null;
  }> = [];

  if (history) {
    for (const sessionReadings of Object.values(history)) {
      if (!sessionReadings) continue;
      for (const raw of Object.values(sessionReadings)) {
        if (!raw) continue;
        const mapped = normaliseFirebaseReading(raw, patientId);
        if (mapped) incoming.push(mapped);
      }
    }
  }

  if (live) {
    for (const raw of Object.values(live)) {
      if (!raw) continue;
      const mapped = normaliseFirebaseReading(raw, patientId);
      if (mapped) incoming.push(mapped);
    }
  }

  if (incoming.length === 0) return { inserted: 0 };

  let minTs = incoming[0].recordedAt;
  let maxTs = incoming[0].recordedAt;
  for (const item of incoming) {
    if (item.recordedAt < minTs) minTs = item.recordedAt;
    if (item.recordedAt > maxTs) maxTs = item.recordedAt;
  }

  const existing = await prisma.sensorReading.findMany({
    where: {
      patientId,
      recordedAt: {
        gte: new Date(minTs.getTime() - 1000),
        lte: new Date(maxTs.getTime() + 1000),
      },
    },
    select: {
      recordedAt: true,
      gsrRaw: true,
      temperature: true,
      heartRate: true,
      spo2: true,
      stressLevel: true,
    },
  });

  const existingKeys = new Set(
    existing.map((item) =>
      makeDedupKey({
        recordedAt: item.recordedAt,
        gsrRaw: item.gsrRaw,
        temperature: item.temperature,
        heartRate: item.heartRate,
        spo2: item.spo2,
        stressLevel: item.stressLevel,
      }),
    ),
  );

  const uniqueIncoming = new Map<string, (typeof incoming)[number]>();
  for (const item of incoming) {
    const key = makeDedupKey(item);
    if (!existingKeys.has(key)) {
      uniqueIncoming.set(key, item);
    }
  }

  const toInsert = Array.from(uniqueIncoming.values());
  if (toInsert.length === 0) return { inserted: 0 };

  const result = await prisma.sensorReading.createMany({ data: toInsert });
  return { inserted: result.count };
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === '1') return true;
    if (lowered === 'false' || lowered === '0') return false;
  }
  return null;
}