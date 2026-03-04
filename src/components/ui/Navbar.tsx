'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
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

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function Navbar() {
  const pathname  = usePathname();

  const [user, setUser]               = useState<NavUser | null>(null);
  const [loading, setLoading]         = useState(true);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-900/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* ── Brand ─────────────────────────────── */}
        <Link
          href={isDoctor ? '/doctor/dashboard' : '/patient/dashboard'}
          className="flex items-center gap-2 text-white transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
            <BrainCircuit size={18} />
          </span>
          <span className="hidden text-sm font-semibold tracking-wide sm:block">
            MindMonitor
          </span>
        </Link>

        {/* ── Desktop Nav Links ──────────────────── */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* ── Right Side ────────────────────────── */}
        <div className="flex items-center gap-2">

          {/* Live indicator */}
          <span className="hidden items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20 sm:flex">
            <Activity size={11} className="animate-pulse" />
            Live
          </span>

          {/* Role badge */}
          <span
            className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 sm:inline-flex ${
              isDoctor
                ? 'bg-blue-500/10 text-blue-300 ring-blue-500/20'
                : 'bg-purple-500/10 text-purple-300 ring-purple-500/20'
            }`}
          >
            {isDoctor ? 'Doctor' : 'Patient'}
          </span>

          {/* ── User dropdown ───────────────────── */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="User menu"
            >
              {/* Avatar */}
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                  {getInitials(user.name)}
                </span>
              )}
              <span className="hidden max-w-30 truncate text-sm font-medium sm:block">
                {user.name}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-white/10 bg-gray-800 p-1 shadow-2xl ring-1 ring-black/20">

                {/* User info */}
                <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                  <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">{user.email}</p>
                </div>

                {/* Profile */}
                <DropdownItem
                  href={isDoctor ? '/doctor/dashboard' : '/patient/dashboard'}
                  icon={<User size={14} />}
                  label="Profile"
                  onClick={() => setDropdownOpen(false)}
                />

                {/* Notifications (placeholder) */}
                <DropdownItem
                  href="#"
                  icon={<Bell size={14} />}
                  label="Notifications"
                  onClick={() => setDropdownOpen(false)}
                />

                {/* Settings (placeholder) */}
                <DropdownItem
                  href="#"
                  icon={<Settings size={14} />}
                  label="Settings"
                  onClick={() => setDropdownOpen(false)}
                />

                <div className="my-1 border-t border-white/10" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* ── Mobile hamburger ────────────────── */}
          <button
            className="flex items-center justify-center rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ───────────────────────────── */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-gray-900 px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}

            <div className="my-2 border-t border-white/10" />

            {/* Mobile user info */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                {getInitials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-gray-400">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ──────────────────────────────────────────────
// Small helper component
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
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
