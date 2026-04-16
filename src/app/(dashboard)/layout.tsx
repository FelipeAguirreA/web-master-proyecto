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

  // Cerrar dropdowns al hacer click fuera
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
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9ff]">
      <header className="bg-[#f9f9ff]/80 backdrop-blur-xl border-b border-gray-100/60 sticky top-0 z-40 h-20">
        <div className="max-w-screen-2xl mx-auto px-8 h-full flex items-center justify-between">
          {/* Logo + nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="font-black text-2xl tracking-tighter">
              <span className="text-brand-700">Practi</span>
              <span className="text-accent-500">X</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              {[
                { href: "/dashboard", label: "Dashboard", inbox: false },
                {
                  href: "/practicas",
                  label: "Explorar prácticas",
                  inbox: false,
                },
                ...(session.user.role === "COMPANY"
                  ? [
                      {
                        href: "/dashboard/empresa/inbox",
                        label: "💬 Mensajes",
                        inbox: true,
                      },
                      {
                        href: "/dashboard/empresa/calendar",
                        label: "📆 Calendario",
                        inbox: false,
                      },
                    ]
                  : session.user.role === "STUDENT"
                    ? [
                        {
                          href: "/dashboard/estudiante/inbox",
                          label: "💬 Mensajes",
                          inbox: true,
                        },
                      ]
                    : []),
              ].map(({ href, label, inbox }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative text-sm font-bold pb-0.5 transition-colors ${
                      active
                        ? "text-brand-700 border-b-2 border-brand-700"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {label}
                    {inbox && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4">
            {session.user.email === ADMIN_EMAIL && (
              <Link
                href="/admin/empresas"
                className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors"
              >
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
                className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-900">
                      Notificaciones
                    </span>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                        <Bell className="w-8 h-8 text-gray-200 mb-2" />
                        <p className="text-sm text-gray-400">
                          Sin notificaciones
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
                            className={`flex gap-3 px-4 py-3 transition-colors ${n.read ? "bg-white" : "bg-brand-50"}`}
                          >
                            <span className="text-lg flex-shrink-0 mt-0.5">
                              {icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 leading-tight">
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                                {n.body}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {new Intl.DateTimeFormat("es-CL", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(n.createdAt))}
                              </p>
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Separador + usuario + dropdown */}
            <div
              ref={dropdownRef}
              className="relative flex items-center gap-3 pl-4 border-l border-gray-200"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900">{name}</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                  {roleLabel}
                </span>
              </div>

              {/* Avatar clickeable */}
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1 group"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={name}
                    className="w-10 h-10 rounded-full border-2 border-brand-100 group-hover:border-brand-400 transition-colors"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold border-2 border-brand-200 group-hover:border-brand-400 transition-colors">
                    {initial}
                  </div>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <Link
                    href="/perfil"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserCircle className="w-4 h-4 text-gray-400" />
                    Editar perfil
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
