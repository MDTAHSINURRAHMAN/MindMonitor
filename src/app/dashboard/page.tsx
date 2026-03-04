/**
 * Role-router dashboard.
 * Redirects authenticated users to the appropriate role-specific dashboard.
 * TODO: fetch user role from the database and redirect accordingly.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // TODO: query the user's role from the database once the schema is set up.
  // For now, redirect to the doctor dashboard as a placeholder.
  redirect("/doctor/dashboard");
}
