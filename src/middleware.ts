import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible only when authenticated
const PROTECTED_PREFIXES = ["/doctor/dashboard", "/patient/dashboard", "/dashboard"];

// Routes accessible only when NOT authenticated
const AUTH_ONLY_PREFIXES = ["/login", "/register"];

// Role-based route guards
const DOCTOR_ONLY_PREFIXES = ["/doctor/dashboard"];
const PATIENT_ONLY_PREFIXES = ["/patient/dashboard"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && user) {
    const role: string = user.user_metadata?.role ?? "";
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  if (user) {
    const role: string = user.user_metadata?.role ?? "";

    // Only enforce role-based guards when the role is definitively known.
    // If role is empty/unknown, let the page-level server component handle it
    // to avoid a /doctor/dashboard ↔ /patient/dashboard redirect loop.
    if (role === "DOCTOR" || role === "PATIENT") {
      // /doctor/dashboard/* — DOCTOR only
      if (DOCTOR_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "DOCTOR") {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/patient/dashboard";
        return NextResponse.redirect(redirectUrl);
      }

      // /patient/dashboard/* — PATIENT only
      if (PATIENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "PATIENT") {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = "/doctor/dashboard";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - /api/sensor  (Arduino POST – uses its own x-api-key auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/sensor).*)",
  ],
};
