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
    // ESP8266 sends millis() (device uptime) not Unix epoch — ts < 1 trillion.
    // Use current wall-clock time as a best-effort recordedAt; dedup is done by
    // sourceTimestampMs (the uptime value itself), NOT by recordedAt.
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

// Fallback dedup key used only when sourceTimestampMs is absent.
function makeHashDedupKey(input: {
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
  // Reject when patientId is explicitly present but belongs to a different patient.
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

  // Primary dedup: stable across refreshes — (sessionId, sourceTimestampMs).
  // Falls back to hash-based dedup only when sourceTimestampMs is absent.
  if (mapped.sourceTimestampMs !== null && mapped.sessionId) {
    const exists = await prisma.sensorReading.findFirst({
      where: { patientId, sessionId: mapped.sessionId, sourceTimestampMs: mapped.sourceTimestampMs },
      select: { id: true },
    });
    if (exists) return { inserted: false };
  } else {
    const nearby = await prisma.sensorReading.findMany({
      where: {
        patientId,
        recordedAt: {
          gte: new Date(mapped.recordedAt.getTime() - 1000),
          lte: new Date(mapped.recordedAt.getTime() + 1000),
        },
      },
      select: { recordedAt: true, gsrRaw: true, temperature: true, heartRate: true, spo2: true, stressLevel: true },
    });

    const incomingKey = makeHashDedupKey(mapped);
    const alreadyExists = nearby.some((item) =>
      makeHashDedupKey({
        recordedAt: item.recordedAt,
        gsrRaw: item.gsrRaw,
        temperature: item.temperature,
        heartRate: item.heartRate,
        spo2: item.spo2,
        stressLevel: item.stressLevel,
      }) === incomingKey,
    );
    if (alreadyExists) return { inserted: false };
  }

  await prisma.sensorReading.create({ data: mapped });
  return { inserted: true };
}

export async function syncFirebaseReadingsForPatient(patientId: string): Promise<{ inserted: number }> {
  const user = await prisma.user.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!user) return { inserted: 0 };

  const sessions = await prisma.monitoringSession.findMany({
    where: { patientId },
    select: { id: true, status: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  if (sessions.length === 0) return { inserted: 0 };

  const sessionIds = sessions.map((s) => s.id);
  const activeSessionId = sessions.find((s) => s.status === 'ACTIVE')?.id ?? null;

  const historyResults = await Promise.all(
    sessions.map((s) =>
      rtdbGet<Record<string, RawFirebaseReading>>(`history/readings/${s.id}`)
        .then((data) => ({ data })),
    ),
  );

  type MappedReading = NonNullable<ReturnType<typeof normaliseFirebaseReading>>;
  const incoming: MappedReading[] = [];

  for (const { data: sessionReadings } of historyResults) {
    if (!sessionReadings) continue;
    for (const raw of Object.values(sessionReadings)) {
      if (!raw) continue;
      const mapped = normaliseFirebaseReading(raw, patientId);
      if (mapped) incoming.push(mapped);
    }
  }

  if (activeSessionId) {
    const liveRaw = await rtdbGet<RawFirebaseReading>(`live/current/${activeSessionId}`);
    if (liveRaw) {
      const mapped = normaliseFirebaseReading(liveRaw, patientId);
      if (mapped) incoming.push(mapped);
    }
  }

  if (incoming.length === 0) return { inserted: 0 };

  // --- Primary dedup: (sessionId, sourceTimestampMs) ---
  // Fetch all existing stable keys for this patient's sessions in one query.
  const existingTs = await prisma.sensorReading.findMany({
    where: {
      patientId,
      sessionId: { in: sessionIds },
      sourceTimestampMs: { not: null },
    },
    select: { sessionId: true, sourceTimestampMs: true },
  });

  const existingTsSet = new Set(
    existingTs.map((r) => `${r.sessionId}|${r.sourceTimestampMs!.toString()}`),
  );

  // Separate readings into those we can dedup by sourceTimestampMs and those we can't.
  const tsDeduped: MappedReading[] = [];
  const needsHashDedup: MappedReading[] = [];

  for (const item of incoming) {
    if (item.sourceTimestampMs !== null && item.sessionId) {
      const key = `${item.sessionId}|${item.sourceTimestampMs.toString()}`;
      if (!existingTsSet.has(key)) {
        tsDeduped.push(item);
        existingTsSet.add(key); // prevent duplicates within this same batch
      }
    } else {
      needsHashDedup.push(item);
    }
  }

  // --- Fallback hash-based dedup for readings without sourceTimestampMs ---
  let hashDeduped: MappedReading[] = [];
  if (needsHashDedup.length > 0) {
    let minTs = needsHashDedup[0].recordedAt;
    let maxTs = needsHashDedup[0].recordedAt;
    for (const item of needsHashDedup) {
      if (item.recordedAt < minTs) minTs = item.recordedAt;
      if (item.recordedAt > maxTs) maxTs = item.recordedAt;
    }

    const existingHash = await prisma.sensorReading.findMany({
      where: {
        patientId,
        recordedAt: {
          gte: new Date(minTs.getTime() - 1000),
          lte: new Date(maxTs.getTime() + 1000),
        },
      },
      select: { recordedAt: true, gsrRaw: true, temperature: true, heartRate: true, spo2: true, stressLevel: true },
    });

    const existingHashKeys = new Set(existingHash.map((item) => makeHashDedupKey({
      recordedAt: item.recordedAt,
      gsrRaw: item.gsrRaw,
      temperature: item.temperature,
      heartRate: item.heartRate,
      spo2: item.spo2,
      stressLevel: item.stressLevel,
    })));

    const seenHashKeys = new Set<string>();
    for (const item of needsHashDedup) {
      const key = makeHashDedupKey(item);
      if (!existingHashKeys.has(key) && !seenHashKeys.has(key)) {
        hashDeduped.push(item);
        seenHashKeys.add(key);
      }
    }
  }

  const toInsert = [...tsDeduped, ...hashDeduped];
  if (toInsert.length === 0) return { inserted: 0 };

  const result = await prisma.sensorReading.createMany({ data: toInsert, skipDuplicates: true });
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
