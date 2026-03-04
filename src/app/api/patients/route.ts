import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PatientRow = { id: string; name: string; email: string };
type ReadingRow = { patientId: string; stressLevel: number; stressLabel: string; recordedAt: Date };

/**
 * GET /api/patients?doctorId=<id>
 * Returns all patients assigned to the given doctor, enriched with their
 * latest sensor reading summary and unacknowledged alert count.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');

  if (!doctorId) {
    return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
  }

  const assignments = await prisma.patientDoctor.findMany({
    where: { doctorId },
    select: {
      patient: { select: { id: true, name: true, email: true } },
    },
  });

  const patients: PatientRow[] = assignments.map(
    (a: { patient: PatientRow }) => a.patient
  );

  if (patients.length === 0) return NextResponse.json([]);

  const patientIds = patients.map((p) => p.id);

  const [rawReadings, alertCounts] = await Promise.all([
    prisma.sensorReading.findMany({
      where: { patientId: { in: patientIds } },
      orderBy: { recordedAt: 'desc' },
      distinct: ['patientId'],
      select: { patientId: true, stressLevel: true, stressLabel: true, recordedAt: true },
    }),
    prisma.alert.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, acknowledged: false },
      _count: { _all: true },
    }),
  ]);

  const readingMap = new Map<string, ReadingRow>();
  for (const r of rawReadings as ReadingRow[]) {
    readingMap.set(r.patientId, r);
  }

  const alertMap = new Map<string, number>();
  for (const a of alertCounts as Array<{ patientId: string; _count: { _all: number } }>) {
    alertMap.set(a.patientId, a._count._all);
  }

  const result = patients.map((p) => {
    const r = readingMap.get(p.id);
    return {
      id:                   p.id,
      name:                 p.name,
      email:                p.email,
      latestStressLevel:    r?.stressLevel ?? null,
      latestStressLabel:    r?.stressLabel ?? null,
      latestReadingAt:      r?.recordedAt?.toISOString() ?? null,
      unacknowledgedAlerts: alertMap.get(p.id) ?? 0,
    };
  });

  result.sort((a, b) => {
    const uA = a.unacknowledgedAlerts * 10 + (a.latestStressLevel ?? 0);
    const uB = b.unacknowledgedAlerts * 10 + (b.latestStressLevel ?? 0);
    return uB - uA;
  });

  return NextResponse.json(result);
}
