import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/patients/available?doctorId=<id>
 * Returns all PATIENT users NOT yet assigned to the given doctor.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');

  if (!doctorId) {
    return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
  }

  const assigned = await prisma.patientDoctor.findMany({
    where: { doctorId },
    select: { patientId: true },
  });

  const assignedIds = assigned.map((a) => a.patientId);

  const available = await prisma.user.findMany({
    where: {
      role: 'PATIENT',
      id: { notIn: assignedIds.length > 0 ? assignedIds : ['__none__'] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(available);
}
