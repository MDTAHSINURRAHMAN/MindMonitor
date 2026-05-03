'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  BrainCircuit,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Stethoscope,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface NavUser {
  id: string;
  email: string;
  name: string;
  role: 'DOCTOR' | 'PATIENT' | string;
  avatarUrl?: string;
}

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// ──────────────────────────────────────────────
// Role-based nav links
// ──────────────────────────────────────────────
const DOCTOR_LINKS: NavLink[] = [
  { label: 'Dashboard',  href: '/doctor/dashboard',             icon: <LayoutDashboard size={16} /> },
  { label: 'Patients',   href: '/doctor/dashboard',             icon: <Users size={16} /> },
  { label: 'Evaluate',   href: '/doctor/dashboard/evaluate',    icon: <Stethoscope size={16} /> },
];

const PATIENT_LINKS: NavLink[] = [
  { label: 'Dashboard',   href: '/patient/dashboard',               icon: <LayoutDashboard size={16} /> },
  { label: 'Evaluations', href: '/patient/dashboard/evaluations',   icon: <ClipboardList size={16} /> },
  { label: 'History',     href: '/patient/dashboard/history',       icon: <History size={16} /> },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getEmailPrefix(email: string) {
  return email.split('@')[0];
}

function displayName(name: string) {
  return name.includes('@') ? name.split('@')[0] : name;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function Navbar() {
  const pathname  = usePathname();

  const [user, setUser]               = useState<NavUser | null>(null);
  const [loading, setLoading]         = useState(true);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hide on auth pages
  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // ── Fetch user on mount ──────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) {
      const { data: profile } = await supabase
        .from('User')
        .select('name, role')
        .eq('id', authUser.id)
        .single();

      if (mounted) {
        setUser({
          id:       authUser.id,
          email:    authUser.email ?? '',
          name:     profile?.name ?? authUser.user_metadata?.full_name ?? authUser.email ?? 'User',
          role:     profile?.role ?? authUser.user_metadata?.role ?? '',
          avatarUrl: authUser.user_metadata?.avatar_url,
        });
        setLoading(false);
      }
    }

    // Use onAuthStateChange for initial session — avoids calling getUser()
    // inside the callback (which can trigger another TOKEN_REFRESHED loop).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        loadProfile(session.user as { id: string; email?: string; user_metadata?: Record<string, string> });
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Close dropdown on outside click ──────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Scroll detection ──────────────────────────
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Close mobile menu on route change is handled via Link onClick ──

  // ── Logout ────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut({ scope: 'local' });
    // Use a full-page navigation so the browser sends fresh (cleared) cookies.
    // router.push() is a client-side transition that reuses the Next.js cache
    // and can leave stale Supabase auth cookies visible to the middleware,
    // causing redirect loops (307) back to the dashboard.
    window.location.replace('/login');
  }

  // ── Don't render on auth pages or while loading ──
  if (isAuthPage) return null;
  if (loading)    return null;
  if (!user)      return null;

  const navLinks = user.role === 'DOCTOR' ? DOCTOR_LINKS : PATIENT_LINKS;
  const isDoctor = user.role === 'DOCTOR';

  const roleAccent = isDoctor
    ? { bg: 'bg-sky-500/10', text: 'text-sky-300', ring: 'ring-sky-500/25' }
    : { bg: 'bg-violet-500/10', text: 'text-violet-300', ring: 'ring-violet-500/25' };

  return (
    <>
      {/* ── Main bar ─────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/10 bg-gray-950/80 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl'
            : 'border-b border-white/[0.07] bg-gray-950/60 backdrop-blur-xl'
        }`}
      >
        {/* subtle top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* ── Brand ─────────────────────────────── */}
          <Link
            href="/"
            className="group flex items-center gap-2.5"
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 ring-1 ring-violet-500/20 shadow-[0_0_14px_rgba(139,92,246,0.2)]"
            >
              <BrainCircuit size={16} className="text-violet-400" />
              <motion.div
                className="absolute inset-0 rounded-xl bg-violet-500/10"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            <span className="hidden text-sm font-bold tracking-wide text-white group-hover:text-violet-200 transition-colors sm:block">
              MindMonitor
            </span>
          </Link>

          {/* ── Desktop Nav Links ──────────────────── */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl bg-violet-500/15 border border-violet-500/25 ring-1 ring-violet-500/20"
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    />
                  )}
                  <span className={`relative z-10 ${active ? 'text-violet-300' : ''}`}>{link.icon}</span>
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── Right side ────────────────────────── */}
          <div className="flex items-center gap-2">

            {/* Live indicator */}
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 sm:flex"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live
            </motion.span>

            {/* Role badge */}
            <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 sm:inline-flex ${roleAccent.bg} ${roleAccent.text} ${roleAccent.ring}`}>
              {isDoctor ? 'Doctor' : 'Patient'}
            </span>

            {/* ── User dropdown ───────────────────── */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-2.5 py-1.5 text-white/70 transition-all duration-200 hover:border-white/15 hover:bg-white/8 hover:text-white"
                aria-label="User menu"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/30 text-[11px] font-bold text-violet-200">
                    {getInitials(user.name)}
                  </span>
                )}
                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{displayName(user.name)}</span>
                <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} />
                </motion.div>
              </motion.button>

              {/* ── Dropdown panel ── */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.55)] ring-1 ring-white/5"
                  >
                    {/* glow blob */}
                    <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl opacity-20 bg-violet-500" />

                    {/* User info */}
                    <div className="relative border-b border-white/8 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/25 text-sm font-bold text-violet-200">
                          {getInitials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{displayName(user.name)}</p>
                          <p className="truncate text-xs text-white/40">{getEmailPrefix(user.email)}</p>
                        </div>
                      </div>
                      <span className={`mt-2.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${roleAccent.bg} ${roleAccent.text} ${roleAccent.ring}`}>
                        {isDoctor ? 'Doctor' : 'Patient'}
                      </span>
                    </div>

                    <div className="relative p-1.5">
                      <DropdownItem href={isDoctor ? '/doctor/dashboard' : '/patient/dashboard'} icon={<User size={14} />} label="Profile" onClick={() => setDropdownOpen(false)} />
                      <DropdownItem href="#" icon={<Bell size={14} />} label="Notifications" onClick={() => setDropdownOpen(false)} />
                      <DropdownItem href="#" icon={<Settings size={14} />} label="Settings" onClick={() => setDropdownOpen(false)} />

                      <div className="my-1.5 border-t border-white/8" />

                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-400 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <LogOut size={14} />
                        Sign out
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Mobile hamburger ────────────────── */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              className="flex items-center justify-center rounded-xl border border-white/8 bg-white/4 p-2 text-white/60 transition-colors hover:bg-white/8 hover:text-white md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={18} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu size={18} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ─────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="sticky top-16 z-40 overflow-hidden border-b border-white/8 bg-gray-950/95 backdrop-blur-2xl md:hidden"
          >
            <div className="px-4 pb-5 pt-3 flex flex-col gap-1">
              {navLinks.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <motion.div
                    key={link.href + link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-violet-500/15 border border-violet-500/25 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={active ? 'text-violet-300' : ''}>{link.icon}</span>
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="my-2 border-t border-white/8" />

              {/* Mobile user card */}
              <div className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/25 text-sm font-bold text-violet-200">
                  {getInitials(user.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{displayName(user.name)}</p>
                  <p className="truncate text-xs text-white/40">{getEmailPrefix(user.email)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${roleAccent.bg} ${roleAccent.text} ${roleAccent.ring}`}>
                  {isDoctor ? 'Doctor' : 'Patient'}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut size={15} />
                Sign out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ──────────────────────────────────────────────
// Dropdown menu item
// ──────────────────────────────────────────────
function DropdownItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.12 }}>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-white/60 transition-all duration-150 hover:bg-white/6 hover:text-white"
      >
        {icon}
        {label}
      </Link>
    </motion.div>
  );
}
