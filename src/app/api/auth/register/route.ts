import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/register
 * Body: { name: string; email: string; role: "PATIENT" | "DOCTOR" }
 *
 * Creates a Prisma User record after Supabase Auth signup succeeds on the client.
 * Called immediately after supabase.auth.signUp() succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role } = body as {
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

    // Upsert so retries (e.g. after a network hiccup) are idempotent.
    // If the record already exists we leave it unchanged and return 200.
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        name: name.trim(),
        email: normalizedEmail,
        role: role as "PATIENT" | "DOCTOR",
      },
      update: {},
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {

    console.error("[POST /api/auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
