import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const EvaluationSchema = z.object({
  patientId:       z.string().min(1),
  doctorId:        z.string().min(1),
  diagnosis:       z.string().min(1).max(2000),
  notes:           z.string().min(1).max(4000),
  recommendations: z.string().max(4000).optional().default(""),
  followUpDate:    z.string().nullable().optional(),
});

/**
 * GET /api/evaluations?patientId=<id>
 * Returns all evaluations for a patient, newest first.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    select: {
      id:              true,
      diagnosis:       true,
      notes:           true,
      recommendations: true,
      followUpDate:    true,
      createdAt:       true,
      doctor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json(evaluations);
}

/**
 * POST /api/evaluations
 * Creates a new evaluation record.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EvaluationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { patientId, doctorId, diagnosis, notes, recommendations, followUpDate } =
    parsed.data;

  const evaluation = await prisma.evaluation.create({
    data: {
      patientId,
      doctorId,
      diagnosis,
      notes,
      recommendations: recommendations ?? "",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
    select: {
      id:              true,
      diagnosis:       true,
      notes:           true,
      recommendations: true,
      followUpDate:    true,
      createdAt:       true,
    },
  });

  return NextResponse.json({ success: true, evaluation }, { status: 201 });
}
