"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Icon } from "@/components/dashboard/Icon";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { computeCvProgress } from "@/lib/cv-progress";

const STUDENT_DRAWER = [
  { icon: "home" as const, label: "Inicio", href: "/dashboard/estudiante" },
  { icon: "search" as const, label: "Prácticas", href: "/practicas" },
  { icon: "heart" as const, label: "Guardadas", href: "/practicas/guardadas" },
  {
    icon: "chat" as const,
    label: "Mensajes",
    href: "/dashboard/estudiante/inbox",
    inbox: true,
  },
  { icon: "user" as const, label: "Mi perfil", href: "/perfil" },
];

const COMPANY_DRAWER = [
  { icon: "home" as const, label: "Inicio", href: "/dashboard/empresa" },
  { icon: "search" as const, label: "Prácticas", href: "/practicas" },
  {
    icon: "chat" as const,
    label: "Mensajes",
    href: "/dashboard/empresa/inbox",
    inbox: true,
  },
  {
    icon: "cal" as const,
    label: "Calendario",
    href: "/dashboard/empresa/calendar",
  },
  {
    icon: "user" as const,
    label: "Mi perfil",
    href: "/dashboard/empresa/perfil",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cvPct, setCvPct] = useState<number | null>(null);
  const [hasCv, setHasCv] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Para STUDENT: calcula el % de completitud del CV/perfil y lo pasa al
  // sidebar para que la card "Tu CV" muestre el mensaje correcto (sin CV /
  // mejorá / top). Sin esto, queda siempre en "Sube tu CV" aunque el user
  // ya lo haya subido. Si el user no es STUDENT, el sidebar recibe null
  // (ver llamada a <DashboardSidebar> abajo) — el effect no setea state
  // sincrónicamente para no violar react-hooks/set-state-in-effect.
  const isStudent = session?.user?.role === "STUDENT";
  useEffect(() => {
    if (!isStudent) return;
    fetchWithRefresh("/api/users/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        setCvPct(user ? computeCvProgress(user) : null);
        setHasCv(Boolean(user?.studentProfile?.cvUrl));
      })
      .catch(() => setCvPct(null));
  }, [isStudent]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && drawerRef.current?.contains(active)) {
      active.blur();
    }
  }, [drawerOpen]);

  const roleEarly = session?.user?.role as "STUDENT" | "COMPANY" | undefined;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        {/* Spinner: border-top usa accent dinámico con alpha via CSS var */}
        <div
          className="w-8 h-8 rounded-full border-2 [animation:practix-spin_.9s_linear_infinite]"
          style={
            {
              "--spinner-border":
                "color-mix(in srgb, var(--color-accent) 15%, transparent)",
              borderColor: "var(--spinner-border)",
              borderTopColor: "var(--color-accent)",
            } as CSSProperties
          }
        />
      </div>
    );
  }

  if (!session) return null;

  const role = roleEarly;
  const isAdmin = session.user.email === ADMIN_EMAIL;
  const name = session.user.name ?? "Usuario";
  const initial = name.charAt(0).toUpperCase();
  const roleLabel =
    role === "STUDENT"
      ? "Estudiante"
      : role === "COMPANY"
        ? "Empresa"
        : "Usuario";
  const drawerItems = role === "COMPANY" ? COMPANY_DRAWER : STUDENT_DRAWER;

  return (
    <div
      data-palette={role === "COMPANY" ? "company" : "student"}
      className="min-h-screen bg-bg text-text flex"
    >
      <DashboardSidebar
        role={role}
        unreadInbox={unreadCount}
        cvPct={isStudent ? cvPct : null}
        hasCv={isStudent ? hasCv : false}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar
          userName={name}
          userEmail={session.user.email ?? ""}
          userImage={session.user.image}
          isAdmin={isAdmin}
          role={role}
          onMenu={() => setDrawerOpen(true)}
        />

        <main className="flex-1 relative">{children}</main>
      </div>

      {/* Mobile drawer overlay */}
      <div
        ref={drawerRef}
        className="fixed inset-0 z-60 transition-opacity duration-200"
        style={{
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
        }}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        {/* Backdrop */}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0 border-none cursor-pointer"
          style={{ background: "rgba(10,9,9,.4)", backdropFilter: "blur(2px)" }}
          aria-label="Cerrar menú"
        />

        {/* Drawer panel */}
        <aside
          className="absolute left-0 top-0 h-full w-[85vw] max-w-[320px] bg-surface flex flex-col transition-transform duration-[250ms] ease-out"
          style={{
            boxShadow: "0 24px 64px -12px rgba(20,15,10,0.24)",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-[18px] pb-[14px] border-b border-border">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-[9px] no-underline"
            >
              <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center font-[800] text-[13px] text-white [background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))]">
                P
              </div>
              <span className="font-[700] text-[15px] text-text tracking-[-0.4px]">
                PractiX
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-9 h-9 border-none bg-transparent rounded-[10px] cursor-pointer inline-flex items-center justify-center text-text"
              aria-label="Cerrar"
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* User info */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Avatar
              ini={initial}
              size={44}
              src={session.user.image}
              alt={name}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-[700] text-text truncate">
                {name}
              </p>
              <p className="text-[11px] text-subtle uppercase tracking-[0.8px] font-[700] mt-0.5">
                {roleLabel}
              </p>
              <p className="text-[11.5px] text-muted truncate mt-0.5">
                {session.user.email}
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            {(() => {
              let bestHref: string | null = null;
              let bestLen = -1;
              for (const it of drawerItems) {
                if (
                  pathname === it.href ||
                  pathname.startsWith(`${it.href}/`)
                ) {
                  if (it.href.length > bestLen) {
                    bestLen = it.href.length;
                    bestHref = it.href;
                  }
                }
              }
              return drawerItems.map((it) => {
                const active = it.href === bestHref;
                const badge =
                  it.inbox && unreadCount > 0 ? String(unreadCount) : null;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setDrawerOpen(false)}
                    className={[
                      "flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[13.5px] no-underline transition-all duration-150",
                      active
                        ? "font-[700] text-accent bg-accent-bg"
                        : "font-[500] text-muted bg-transparent",
                    ].join(" ")}
                  >
                    <Icon
                      name={it.icon}
                      size={17}
                      color={
                        active ? "var(--color-accent)" : "var(--color-muted)"
                      }
                    />
                    <span className="flex-1">{it.label}</span>
                    {badge && (
                      <span className="bg-text text-white text-[10px] font-[800] px-[7px] py-[2px] rounded-[10px]">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              });
            })()}
            {isAdmin && (
              <Link
                href="/admin/empresas"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-[10px] mt-1 rounded-[10px] text-[13.5px] font-[700] text-white bg-text no-underline"
              >
                <Icon name="set" size={16} color="#fff" />
                Panel admin
              </Link>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-border px-3 py-[10px] flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[13.5px] font-[500] text-[#C2410C] bg-transparent border-none cursor-pointer w-full text-left"
            >
              <Icon name="x" size={16} color="#C2410C" />
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
