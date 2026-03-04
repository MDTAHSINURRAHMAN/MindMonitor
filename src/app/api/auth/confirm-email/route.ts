import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * POST /api/auth/confirm-email
 * Body: { email: string }
 *
 * Auto-confirms a Supabase Auth user's email using the service-role admin
 * client. Called server-side only (service key is never sent to the browser).
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Look up the user by email
    const { data: listData, error: listError } =
      await admin.auth.admin.listUsers();

    if (listError) {
      console.error("[confirm-email] listUsers error", listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Confirm the email by updating the user record
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error("[confirm-email] updateUserById error", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[confirm-email] unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
