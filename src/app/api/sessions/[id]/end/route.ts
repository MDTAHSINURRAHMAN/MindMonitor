import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rtdbDelete, rtdbGet } from '@/lib/firebaseRtdbServer';

type ActiveSessionPayload = {
  sessionId?: string;
};

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

  try {
    const active = await rtdbGet<ActiveSessionPayload>('bridge/activeSession');
    if (active?.sessionId === id) {
      await rtdbDelete('bridge/activeSession');
    }
  } catch {
    // DB remains source-of-truth for session lifecycle.
  }

  return NextResponse.json(session);
}
