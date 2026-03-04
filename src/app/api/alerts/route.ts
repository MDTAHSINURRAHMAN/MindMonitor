import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/alerts?doctorId=<id>    — all alerts across the doctor's patients
 * GET /api/alerts?patientId=<id>   — alerts for a single patient
 *
 * Optional: &acknowledged=true|false to filter by acknowledgement status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId   = searchParams.get('doctorId');
  const patientId  = searchParams.get('patientId');
  const acknowledged = searchParams.get('acknowledged');
  const ackFilter  = acknowledged !== null ? { acknowledged: acknowledged === 'true' } : {};

  if (patientId) {
    // Single-patient path
    const alerts = await prisma.alert.findMany({
      where: { patientId, ...ackFilter },
      orderBy: { createdAt: 'desc' },
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(
      alerts.map(({ patient, ...a }) => ({ ...a, patientName: patient.name }))
    );
  }

  if (doctorId) {
    // Doctor-scoped path — collect all assigned patient IDs first
    const assignments = await prisma.patientDoctor.findMany({
      where: { doctorId },
      select: { patientId: true },
    });
    const patientIds = assignments.map((a) => a.patientId);

    if (patientIds.length === 0) return NextResponse.json([]);

    const alerts = await prisma.alert.findMany({
      where: { patientId: { in: patientIds }, ...ackFilter },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { patient: { select: { name: true } } },
    });
    return NextResponse.json(
      alerts.map(({ patient, ...a }) => ({ ...a, patientName: patient.name }))
    );
  }

  return NextResponse.json({ error: 'doctorId or patientId is required' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patientId, type, message, severity } = body;

  if (!patientId || !type || !message || severity == null) {
    return NextResponse.json(
      { error: 'patientId, type, message, and severity are required' },
      { status: 400 }
    );
  }

  const alert = await prisma.alert.create({
    data: { patientId, type, message, severity },
  });

  return NextResponse.json(alert, { status: 201 });
}
