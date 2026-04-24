"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Eye, EyeOff, Lock, Mail, User, Stethoscope, Activity,
  ArrowRight, AlertCircle, UserPlus, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────
type Role = "PATIENT" | "DOCTOR";
interface FormState { name: string; email: string; password: string; role: Role; }

// ── Floating orb (landing-page matching) ─────────────────────
function FloatingOrb({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={style}
      animate={{ y: [0, -24, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 7, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Animated input field ──────────────────────────────────────
interface InputFieldProps {
  id: string; label: string; type: string; autoComplete: string;
  value: string; onChange: (v: string) => void; placeholder: string;
  icon: React.ReactNode; delay: number; rightSlot?: React.ReactNode;
  hint?: string;
}
function InputField({ id, label, type, autoComplete, value, onChange,
  placeholder, icon, delay, rightSlot, hint }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <label htmlFor={id} className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
        {label}
      </label>
      <div className="relative group">
        <AnimatePresence>
          {focused && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-violet-500/60 shadow-[0_0_18px_rgba(139,92,246,0.35)]"
            />
          )}
        </AnimatePresence>
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors duration-200">
          {icon}
        </span>
        <input
          id={id} type={type} autoComplete={autoComplete} required
          value={value} onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none transition-colors duration-200"
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-white/25">{hint}</p>}
    </motion.div>
  );
}

// ── Password strength meter ───────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const levels = [
    { label: "Too short", color: "bg-rose-500" },
    { label: "Weak", color: "bg-rose-400" },
    { label: "Fair", color: "bg-amber-400" },
    { label: "Good", color: "bg-yellow-400" },
    { label: "Strong", color: "bg-emerald-400" },
    { label: "Very strong", color: "bg-emerald-500" },
  ];
  const current = levels[Math.min(score, 5)];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-2"
    >
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-400 ${
              i <= score ? current.color : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        score <= 1 ? "text-rose-400" : score <= 2 ? "text-amber-400" : "text-emerald-400"
      }`}>
        {current.label}
      </p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "", role: "PATIENT" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1 — Create Supabase Auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, role: form.role } },
    });

    const isEmailRateLimit =
      authError &&
      (authError.message?.toLowerCase().includes("rate limit") ||
        authError.message?.toLowerCase().includes("over_email_send_rate_limit") ||
        authError.message?.toLowerCase().includes("email") ||
        (authError as { status?: number }).status === 429);

    if (authError && !isEmailRateLimit) {
      setError(authError.message || "Sign-up failed. Please try again.");
      setLoading(false);
      return;
    }
    if (!data.user && !isEmailRateLimit) {
      setError("Sign-up failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2 — Create matching Prisma User record (use the Supabase user ID so that
    // the Prisma User.id == Supabase auth UID everywhere in the app).
    const supabaseUserId = data.user?.id;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: supabaseUserId, name: form.name, email: form.email, role: form.role }),
    });

    if (!res.ok && res.status !== 409) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save profile. Please contact support.");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!data.session) {
      router.push("/login?registered=1");
    } else {
      router.push(form.role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard");
      router.refresh();
    }
  }

  const roleConfig = {
    PATIENT: {
      icon: <User className="w-5 h-5" />,
      label: "Patient",
      desc: "Monitor my health",
      accentRing: "ring-violet-500/50",
      accentBg: "bg-violet-500/15",
      accentBorder: "border-violet-500/40",
      accentText: "text-violet-300",
      glow: "shadow-[0_0_24px_rgba(139,92,246,0.3)]",
    },
    DOCTOR: {
      icon: <Stethoscope className="w-5 h-5" />,
      label: "Doctor",
      desc: "Oversee my patients",
      accentRing: "ring-sky-500/50",
      accentBg: "bg-sky-500/15",
      accentBorder: "border-sky-500/40",
      accentText: "text-sky-300",
      glow: "shadow-[0_0_24px_rgba(56,189,248,0.3)]",
    },
  } as const;

  return (
    <main className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-gray-950 px-4 py-16">

      {/* ── background orbs ── */}
      <FloatingOrb style={{ width: 500, height: 500, top: "-8%", left: "-12%", background: "rgba(139,92,246,0.15)" }} delay={0} />
      <FloatingOrb style={{ width: 400, height: 400, bottom: "2%", right: "-10%", background: "rgba(56,189,248,0.12)" }} delay={2} />
      <FloatingOrb style={{ width: 240, height: 240, top: "50%", right: "15%", background: "rgba(244,63,94,0.08)" }} delay={4.5} />

      {/* ── grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* ── Brand ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col items-center mb-10"
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="relative mb-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 ring-1 ring-violet-500/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_32px_rgba(139,92,246,0.25)]">
              <Activity className="w-8 h-8 text-violet-400" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-2xl bg-violet-500/10"
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MindMonitor</h1>
          <p className="text-sm text-white/40 mt-1 tracking-wide">Mental Health Monitoring Platform</p>
        </motion.div>

        {/* ── Glass card ── */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-white/4 backdrop-blur-2xl border border-white/10 ring-1 ring-white/5 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
        >
          {/* card inner glow blobs */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-15 bg-violet-500" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full blur-3xl opacity-10 bg-sky-500" />

          {/* heading */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300 uppercase tracking-widest mb-4">
              <UserPlus className="w-3 h-3" />
              Create Account
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">Join MindMonitor</h2>
            <p className="text-sm text-white/40 mt-1">Set up your account in seconds</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Role selector ── */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
            >
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["PATIENT", "DOCTOR"] as const).map((r) => {
                  const cfg = roleConfig[r];
                  const active = form.role === r;
                  return (
                    <motion.button
                      key={r}
                      type="button"
                      onClick={() => set("role", r)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`relative flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border transition-all duration-200 overflow-hidden ${
                        active
                          ? `${cfg.accentBorder} ${cfg.accentBg} ring-1 ${cfg.accentRing} ${cfg.glow}`
                          : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/6"
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="role-active-bg"
                          className="pointer-events-none absolute inset-0 opacity-10"
                          style={{ background: r === "PATIENT" ? "rgba(139,92,246,1)" : "rgba(56,189,248,1)" }}
                          transition={{ type: "spring", stiffness: 280, damping: 26 }}
                        />
                      )}
                      <span className={active ? cfg.accentText : "text-white/40"}>
                        {cfg.icon}
                      </span>
                      <span className={`text-sm font-semibold ${active ? cfg.accentText : "text-white/60"}`}>
                        {cfg.label}
                      </span>
                      <span className={`text-[11px] ${active ? "text-white/50" : "text-white/25"}`}>
                        {cfg.desc}
                      </span>
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${cfg.accentText}`} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Full name ── */}
            <InputField
              id="name"
              label="Full name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="John Doe"
              icon={<User className="w-4 h-4" />}
              delay={0.32}
            />

            {/* ── Email ── */}
            <InputField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(v) => set("email", v)}
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              delay={0.38}
            />

            {/* ── Password ── */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.44, ease: "easeOut" }}
            >
              <label htmlFor="password" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">
                Password
              </label>
              <PasswordInputField
                showPassword={showPassword}
                value={form.password}
                onChange={(v) => set("password", v)}
                onToggle={() => setShowPassword((p) => !p)}
              />
              <AnimatePresence>
                {form.password && <PasswordStrength password={form.password} />}
              </AnimatePresence>
            </motion.div>

            {/* ── Error banner ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-sm text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.54 }}
            >
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, boxShadow: "0 0 28px rgba(139,92,246,0.45)" }}
                whileTap={loading ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="relative w-full py-3 px-4 rounded-xl bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm overflow-hidden transition-all duration-200 shadow-[0_4px_24px_rgba(139,92,246,0.35)]"
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <motion.span
                        className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Creating account…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      Create account
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Divider + sign-in link */}
          <div className="mt-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/25 whitespace-nowrap">Have an account?</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="mt-5"
          >
            <Link
              href="/login"
              className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-violet-500/40 text-white/60 hover:text-white text-sm font-medium transition-all duration-200"
            >
              Sign in instead
              <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          className="text-center text-xs text-white/20 mt-6"
        >
          By creating an account, you agree to our privacy policy &amp; terms of service
        </motion.p>
      </div>
    </main>
  );
}

// ── Extracted password input (avoids invalid hook call inside AnimatePresence) ──
function PasswordInputField({
  showPassword, value, onChange, onToggle,
}: { showPassword: boolean; value: string; onChange: (v: string) => void; onToggle: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative group">
      <AnimatePresence>
        {focused && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-violet-500/60 shadow-[0_0_18px_rgba(139,92,246,0.35)]"
          />
        )}
      </AnimatePresence>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-violet-400 transition-colors duration-200">
        <Lock className="w-4 h-4" />
      </span>
      <input
        id="password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Min. 6 characters"
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none transition-colors duration-200"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
