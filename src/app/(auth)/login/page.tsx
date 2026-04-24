"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Eye, EyeOff, Lock, Mail, Activity,
  ArrowRight, CheckCircle2, AlertCircle, Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Floating orb (matches landing page) ──────────────────────
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

// ── Animated input wrapper ────────────────────────────────────
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  delay: number;
  rightSlot?: React.ReactNode;
}
function InputField({
  id, label, type, autoComplete, value, onChange,
  placeholder, icon, delay, rightSlot,
}: InputFieldProps) {
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
        {/* glow ring on focus */}
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
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none transition-colors duration-200"
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Login form (needs Suspense for useSearchParams) ───────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setInfo("Account created! You can now sign in.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      const msg = authError.message ?? "";
      if (msg.toLowerCase().includes("email not confirmed")) {
        const confirmRes = await fetch("/api/auth/confirm-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (confirmRes.ok) {
          const { data: retryData, error: retryError } =
            await supabase.auth.signInWithPassword({ email, password });
          setLoading(false);
          if (retryError) {
            setError(retryError.message || "Sign-in failed. Please check your credentials.");
            return;
          }
          const role: string = retryData.user?.user_metadata?.role ?? "PATIENT";
          router.refresh();
          router.push(role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard");
          return;
        }
        setError("Sign-in failed. Please check your credentials.");
      } else if (
        msg.toLowerCase().includes("rate limit") ||
        (authError as { status?: number }).status === 429
      ) {
        setError("Too many sign-in attempts. Please wait a few minutes and try again.");
      } else {
        setError(msg || "Sign-in failed. Please check your credentials.");
      }
      setLoading(false);
      return;
    }

    const role: string = data.user?.user_metadata?.role ?? "PATIENT";
    router.refresh();
    router.push(role === "DOCTOR" ? "/doctor/dashboard" : "/patient/dashboard");
  }

  return (
    <main className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-gray-950 px-4 py-16">

      {/* ── background orbs (landing-page matching) ── */}
      <FloatingOrb style={{ width: 520, height: 520, top: "-12%", left: "-10%", background: "rgba(139,92,246,0.16)" }} delay={0} />
      <FloatingOrb style={{ width: 380, height: 380, bottom: "4%", right: "-8%", background: "rgba(56,189,248,0.12)" }} delay={2.5} />
      <FloatingOrb style={{ width: 260, height: 260, top: "38%", right: "12%", background: "rgba(244,63,94,0.09)" }} delay={5} />

      {/* ── subtle grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── page content ── */}
      <div className="relative z-10 w-full max-w-md">

        {/* Brand */}
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

        {/* ── glassmorphism card ── */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-white/4 backdrop-blur-2xl border border-white/10 ring-1 ring-white/5 p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
        >
          {/* card inner glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-15 bg-violet-500" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full blur-3xl opacity-10 bg-sky-500" />

          {/* heading */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300 uppercase tracking-widest mb-4">
              <Shield className="w-3 h-3" />
              Secure Sign-in
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">Welcome back</h2>
            <p className="text-sm text-white/40 mt-1">Sign in to your MindMonitor account</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <InputField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              delay={0.3}
            />

            {/* Password */}
            <InputField
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              delay={0.38}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/30 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Banners */}
            <AnimatePresence mode="wait">
              {info && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 text-sm text-emerald-300"
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  {info}
                </motion.div>
              )}
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

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.48 }}
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
                      Signing in…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2"
                    >
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Divider */}
          <div className="mt-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/25 whitespace-nowrap">New to MindMonitor?</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-5"
          >
            <Link
              href="/register"
              className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-violet-500/40 text-white/60 hover:text-white text-sm font-medium transition-all duration-200"
            >
              Create an account
              <ArrowRight className="w-3.5 h-3.5 -translate-x-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="text-center text-xs text-white/20 mt-6"
        >
          Protected by end-to-end encryption &amp; secure auth
        </motion.p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
