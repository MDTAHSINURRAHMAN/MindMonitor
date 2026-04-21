import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/appointments?patientId=xxx  or  ?doctorId=xxx
// Optional: ?status=SCHEDULED,ACTIVE,COMPLETED  (comma-separated, defaults to all)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const patientId = searchParams.get('patientId');
  const doctorId  = searchParams.get('doctorId');
  const statusParam = searchParams.get('status');

  if (!patientId && !doctorId) {
    return NextResponse.json({ error: 'patientId or doctorId required' }, { status: 400 });
  }

  const statusFilter = statusParam
    ? (statusParam.split(',') as ('SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED')[])
    : undefined;

  const appointments = await prisma.videoAppointment.findMany({
    where: {
      ...(patientId ? { patientId } : { doctorId: doctorId! }),
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor:  { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(appointments);
}

// POST /api/appointments  → { patientId, doctorId, scheduledAt }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { patientId, doctorId, scheduledAt } = body as {
    patientId?: string;
    doctorId?: string;
    scheduledAt?: string;
  };

  if (!patientId || !doctorId || !scheduledAt) {
    return NextResponse.json(
      { error: 'patientId, doctorId, and scheduledAt are required' },
      { status: 400 }
    );
  }

  const appointment = await prisma.videoAppointment.create({
    data: {
      patientId,
      doctorId,
      scheduledAt: new Date(scheduledAt),
    },
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor:  { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(appointment, { status: 201 });
}
