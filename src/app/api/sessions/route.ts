import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/sessions?patientId=xxx  → active session or null
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get('patientId');
  if (!patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 });
  }

  const session = await prisma.monitoringSession.findFirst({
    where: { patientId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
  });

  return NextResponse.json(session ?? null);
}

// POST /api/sessions  → create active session (ends any existing ones first)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { patientId, deviceId } = body as { patientId?: string; deviceId?: string };

  if (!patientId) {
    return NextResponse.json({ error: 'patientId required' }, { status: 400 });
  }

  // End any existing active sessions for this patient
  await prisma.monitoringSession.updateMany({
    where: { patientId, status: 'ACTIVE' },
    data: { status: 'ENDED', endedAt: new Date() },
  });

  const session = await prisma.monitoringSession.create({
    data: { patientId, deviceId: deviceId ?? null, status: 'ACTIVE' },
  });

  return NextResponse.json(session, { status: 201 });
}
