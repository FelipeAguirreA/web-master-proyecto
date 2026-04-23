"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Calendar,
  UserCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

type PublicNavProps = {
  isLoggedIn: boolean;
  isAdmin?: boolean;
};

const PUBLIC_LINKS = [
  { label: "Prácticas", href: "/practicas" },
  { label: "Producto", href: "/#producto" },
  { label: "Para empresas", href: "/#empresas" },
];

type DashboardLink = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

function dashboardLinksFor(role: string | undefined): DashboardLink[] {
  const base: DashboardLink[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Prácticas", href: "/practicas", icon: Briefcase },
  ];

  if (role === "COMPANY") {
    base.push(
      {
        label: "Mensajes",
        href: "/dashboard/empresa/inbox",
        icon: MessageSquare,
      },
      {
        label: "Calendario",
        href: "/dashboard/empresa/calendar",
        icon: Calendar,
      },
    );
  } else if (role === "STUDENT") {
    base.push({
      label: "Mensajes",
      href: "/dashboard/estudiante/inbox",
      icon: MessageSquare,
    });
  }

  return base;
}

export function PublicNav({ isLoggedIn, isAdmin = false }: PublicNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const isPracticasActive =
    pathname === "/practicas" || pathname.startsWith("/practicas/");

  const dashboardLinks = isLoggedIn ? dashboardLinksFor(role) : [];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl border border-black/[0.05] px-3 sm:px-5 py-2.5 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="md:hidden w-9 h-9 -ml-1 inline-flex items-center justify-center rounded-xl text-[#4A4843] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" strokeWidth={2.2} />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]">
                  <span className="text-white font-bold text-[15px] leading-none tracking-tight">
                    P
                  </span>
                </span>
                <span className="text-[17px] font-semibold tracking-[-0.015em] text-[#0A0909]">
                  PractiX
                </span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] rounded-xl p-1">
              {PUBLIC_LINKS.map((item) => {
                const active = item.href === "/practicas" && isPracticasActive;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      active
                        ? "text-[13px] font-semibold text-[#0A0909] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] px-3.5 py-1.5 rounded-lg"
                        : "text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] hover:bg-white/80 transition-all px-3.5 py-1.5 rounded-lg"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {isLoggedIn ? (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin/empresas"
                      className="hidden sm:inline-flex text-[12px] font-medium text-[#FF6A3D] bg-[#FF6A3D]/10 hover:bg-[#FF6A3D]/15 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="hidden sm:inline-flex text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] px-3 py-1.5 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-medium bg-[#0A0909] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    <span className="hidden sm:inline">Ir al panel</span>
                    <span className="sm:hidden">Panel</span>
                    <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] px-3 py-1.5 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13px] font-medium bg-[#0A0909] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    <span className="hidden sm:inline">Empezar gratis</span>
                    <span className="sm:hidden">Entrar</span>
                    <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-[60] transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-[#0A0909]/40 backdrop-blur-[2px]"
          aria-label="Cerrar menú"
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[85vw] max-w-[320px] bg-white shadow-[0_24px_64px_-12px_rgba(20,15,10,0.24)] flex flex-col transition-transform duration-250 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.05]">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2"
            >
              <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]">
                <span className="text-white font-bold text-[15px] leading-none tracking-tight">
                  P
                </span>
              </span>
              <span className="text-[17px] font-semibold tracking-[-0.015em] text-[#0A0909]">
                PractiX
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-[#4A4843] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </div>

          {isLoggedIn ? (
            <>
              {session?.user?.name && (
                <div className="px-5 py-4 border-b border-black/[0.05] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[14px] font-bold shadow-[0_2px_8px_-2px_rgba(255,106,61,0.4)]">
                    {session.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#0A0909] truncate">
                      {session.user.name}
                    </p>
                    <p className="text-[11px] text-[#9B9891] uppercase tracking-[0.08em] font-semibold mt-0.5">
                      {role === "STUDENT"
                        ? "Estudiante"
                        : role === "COMPANY"
                          ? "Empresa"
                          : "Usuario"}
                    </p>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                {dashboardLinks.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={`relative inline-flex items-center gap-3 text-[14px] font-medium px-3 py-2.5 rounded-xl transition-all ${
                        active
                          ? "bg-[#FFF3EC] text-[#FF6A3D]"
                          : "text-[#4A4843] hover:bg-black/[0.03] active:bg-black/[0.05]"
                      }`}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        strokeWidth={2.2}
                      />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    href="/admin/empresas"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-3 text-[14px] font-semibold bg-[#0A0909] text-white px-3 py-2.5 rounded-xl mt-2 hover:bg-[#1a1816] active:bg-[#2a2824] transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" strokeWidth={2.4} />
                    Panel admin
                  </Link>
                )}
              </nav>

              <div className="border-t border-black/[0.05] px-3 py-3 flex flex-col gap-1">
                <Link
                  href="/perfil"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-[#4A4843] hover:bg-[#FAFAF8] active:bg-black/[0.05] transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-[#9B9891]" />
                  Editar perfil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13.5px] text-[#C2410C] hover:bg-[#FFF0ED] active:bg-[#FFE1DA] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : (
            <>
              <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                {PUBLIC_LINKS.map((item) => {
                  const active =
                    item.href === "/practicas" && isPracticasActive;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`text-[14px] font-medium px-3 py-2.5 rounded-xl transition-all ${
                        active
                          ? "bg-[#FFF3EC] text-[#FF6A3D] font-semibold"
                          : "text-[#4A4843] hover:bg-black/[0.03] active:bg-black/[0.05]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-black/[0.05] px-3 py-3 flex flex-col gap-1">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-[13.5px] font-medium text-center text-[#4A4843] hover:text-[#0A0909] hover:bg-[#FAFAF8] px-3 py-2.5 rounded-xl transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium bg-[#0A0909] text-white px-3 py-2.5 rounded-xl hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                >
                  Empezar gratis
                  <span className="text-[11px]">→</span>
                </Link>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
