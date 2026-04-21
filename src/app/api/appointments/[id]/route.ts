import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/appointments/[id]
// Body: { status } or { status, startedAt } or { status, endedAt }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  const validStatuses = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    status: status as 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  };

  if (status === 'ACTIVE')    data.startedAt = new Date();
  if (status === 'COMPLETED') data.endedAt   = new Date();

  const appointment = await prisma.videoAppointment.update({
    where: { id },
    data,
    include: {
      patient: { select: { id: true, name: true, email: true } },
      doctor:  { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(appointment);
}

// DELETE /api/appointments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.videoAppointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
