import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/patients/assign
 * Body: { doctorId: string; patientId: string }
 * Creates a PatientDoctor assignment.
 */
export async function POST(req: NextRequest) {
  try {
    const { doctorId, patientId } = await req.json() as {
      doctorId?: string;
      patientId?: string;
    };

    if (!doctorId || !patientId) {
      return NextResponse.json({ error: 'doctorId and patientId are required' }, { status: 400 });
    }

    await prisma.patientDoctor.upsert({
      where: { patientId_doctorId: { patientId, doctorId } },
      create: { patientId, doctorId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/patients/assign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
