import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/sessions/[id]/end  → end an active session
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.monitoringSession.update({
    where: { id },
    data: { status: 'ENDED', endedAt: new Date() },
  });

  return NextResponse.json(session);
}
