"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  UserCircle,
  LogOut,
  ChevronDown,
  CheckCheck,
  LayoutDashboard,
  Compass,
  MessageSquare,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNotifications } from "@/hooks/useNotifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount: notifCount,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#FAFAF8]"
        style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
      >
        <div className="w-8 h-8 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const name = session.user.name ?? "";
  const initial = name.charAt(0).toUpperCase();
  const roleLabel =
    session.user.role === "STUDENT"
      ? "Estudiante"
      : session.user.role === "COMPANY"
        ? "Empresa"
        : "Usuario";

  const navItems: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    inbox?: boolean;
  }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/practicas", label: "Explorar", icon: Compass },
    ...(session.user.role === "COMPANY"
      ? [
          {
            href: "/dashboard/empresa/inbox",
            label: "Mensajes",
            icon: MessageSquare,
            inbox: true,
          },
          {
            href: "/dashboard/empresa/calendar",
            label: "Calendario",
            icon: Calendar,
          },
        ]
      : session.user.role === "STUDENT"
        ? [
            {
              href: "/dashboard/estudiante/inbox",
              label: "Mensajes",
              icon: MessageSquare,
              inbox: true,
            },
          ]
        : []),
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#0A0909] relative"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      {/* Ambient warm mesh (sutil, fijo) */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        aria-hidden
      >
        <div className="absolute -top-40 -left-32 w-[620px] h-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.22),transparent_72%)] blur-[70px]" />
        <div className="absolute top-1/2 -right-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.16),transparent_70%)] blur-[70px]" />
      </div>

      <header className="sticky top-0 z-40 px-4 md:px-6 pt-4">
        <div className="max-w-screen-2xl mx-auto bg-white/75 backdrop-blur-xl border border-black/[0.06] rounded-2xl shadow-[0_8px_24px_-12px_rgba(20,15,10,0.08)] px-4 md:px-5 h-16 flex items-center justify-between">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em] text-[#0A0909] hover:opacity-80 transition-opacity"
            >
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center text-white text-[13px] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.4)]">
                P
              </span>
              Practi
              <span className="bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] bg-clip-text text-transparent">
                X
              </span>
            </Link>

            <nav className="hidden md:flex gap-1 items-center">
              {navItems.map(({ href, label, icon: Icon, inbox }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard" ||
                      pathname.startsWith("/dashboard/")
                      ? pathname === "/dashboard" ||
                        pathname.startsWith("/dashboard/estudiante") ||
                        pathname === "/dashboard/empresa"
                      : false
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-xl transition-all ${
                      active
                        ? "bg-[#FFF3EC] text-[#FF6A3D]"
                        : "text-[#4A4843] hover:bg-black/[0.03] hover:text-[#0A0909]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {label}
                    {inbox && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center px-1 shadow-[0_2px_6px_-1px_rgba(255,106,61,0.5)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {session.user.email === ADMIN_EMAIL && (
              <Link
                href="/admin/empresas"
                className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-semibold bg-[#0A0909] text-white px-3 py-1.5 rounded-full hover:bg-[#1a1816] transition-colors"
              >
                <ShieldCheck className="w-3 h-3" strokeWidth={2.4} />
                Admin
              </Link>
            )}

            {/* Campana */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => {
                  setBellOpen((v) => !v);
                  if (!bellOpen && notifCount > 0) markAllRead();
                }}
                className="relative w-9 h-9 inline-flex items-center justify-center rounded-xl text-[#4A4843] hover:bg-black/[0.04] transition-all"
              >
                <Bell className="w-4 h-4" strokeWidth={2.2} />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF6A3D] rounded-full ring-2 ring-white" />
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-[0_16px_48px_-12px_rgba(20,15,10,0.18)] border border-black/[0.06] overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
                    <div>
                      <p className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                        Notificaciones
                      </p>
                      <p className="text-[10.5px] text-[#9B9891] mt-0.5">
                        {notifications.length} en total
                      </p>
                    </div>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[11px] text-[#FF6A3D] font-semibold hover:text-[#FF5A28] transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-[380px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-11 h-11 rounded-2xl bg-[#FAFAF8] flex items-center justify-center mb-3">
                          <Bell className="w-5 h-5 text-[#C9C6BF]" />
                        </div>
                        <p className="text-[12.5px] text-[#6D6A63] font-medium">
                          Sin notificaciones por ahora
                        </p>
                        <p className="text-[11px] text-[#9B9891] mt-1">
                          Te avisamos acá cuando pase algo.
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const icon =
                          n.type === "APPLICATION_ACCEPTED"
                            ? "🎉"
                            : n.type === "APPLICATION_REJECTED"
                              ? "❌"
                              : "👀";
                        return (
                          <div
                            key={n.id}
                            className={`flex gap-3 px-4 py-3 transition-colors border-b border-black/[0.04] last:border-0 ${n.read ? "bg-white" : "bg-[#FFF7F2]"}`}
                          >
                            <span className="text-base flex-shrink-0 mt-0.5">
                              {icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-semibold text-[#0A0909] leading-tight">
                                {n.title}
                              </p>
                              <p className="text-[11.5px] text-[#6D6A63] mt-1 leading-[1.45]">
                                {n.body}
                              </p>
                              <p className="text-[10.5px] text-[#9B9891] mt-1.5">
                                {new Intl.DateTimeFormat("es-CL", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(n.createdAt))}
                              </p>
                            </div>
                            {!n.read && (
                              <div className="w-1.5 h-1.5 bg-[#FF6A3D] rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Usuario + dropdown */}
            <div
              ref={dropdownRef}
              className="relative flex items-center gap-2.5 pl-2 ml-1 border-l border-black/[0.06]"
            >
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-[12.5px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                  {name}
                </span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-[#9B9891] font-semibold">
                  {roleLabel}
                </span>
              </div>

              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1 group"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(20,15,10,0.15)] group-hover:ring-[#FFD6B8] transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[13px] font-bold ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(255,106,61,0.4)] group-hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.55)] transition-all">
                    {initial}
                  </div>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#9B9891] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_16px_48px_-12px_rgba(20,15,10,0.18)] border border-black/[0.06] overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-black/[0.05]">
                    <p className="text-[13px] font-semibold text-[#0A0909] truncate">
                      {name}
                    </p>
                    <p className="text-[11.5px] text-[#6D6A63] truncate mt-0.5">
                      {session.user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/perfil"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#4A4843] hover:bg-[#FAFAF8] hover:text-[#0A0909] transition-colors"
                    >
                      <UserCircle className="w-4 h-4 text-[#9B9891]" />
                      Editar perfil
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[#C2410C] hover:bg-[#FFF0ED] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
