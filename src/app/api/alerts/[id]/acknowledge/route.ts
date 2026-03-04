import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/alerts/[id]/acknowledge
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const alert = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true },
    });
    return NextResponse.json({ success: true, alert });
  } catch {
    return NextResponse.json({ error: 'Alert not found or already acknowledged' }, { status: 404 });
  }
}
