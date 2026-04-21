import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/register
 * Body: { name: string; email: string; role: "PATIENT" | "DOCTOR" }
 *
 * Creates a Prisma User record after Supabase Auth signup succeeds on the client.
 * After creation, auto-assigns the new user:
 *   - PATIENT → assigned to every existing DOCTOR
 *   - DOCTOR  → all existing PATIENTs assigned to them
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, role } = body as {
      id?: string;
      name?: string;
      email?: string;
      role?: string;
    };

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      !["PATIENT", "DOCTOR"].includes(role ?? "")
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        ...(id ? { id } : {}),
        name: name.trim(),
        email: normalizedEmail,
        role: role as "PATIENT" | "DOCTOR",
      },
      update: {},
      select: { id: true, name: true, email: true, role: true },
    });

    // Auto-assign: connect the new user to all existing counterparts.
    if (role === "PATIENT") {
      const doctors = await prisma.user.findMany({
        where: { role: "DOCTOR" },
        select: { id: true },
      });
      if (doctors.length > 0) {
        await prisma.patientDoctor.createMany({
          data: doctors.map((d) => ({ patientId: user.id, doctorId: d.id })),
          skipDuplicates: true,
        });
      }
    } else if (role === "DOCTOR") {
      const patients = await prisma.user.findMany({
        where: { role: "PATIENT" },
        select: { id: true },
      });
      if (patients.length > 0) {
        await prisma.patientDoctor.createMany({
          data: patients.map((p) => ({ patientId: p.id, doctorId: user.id })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
