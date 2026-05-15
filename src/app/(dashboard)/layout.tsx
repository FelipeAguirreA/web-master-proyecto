"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { paletteFor } from "@/components/dashboard/palettes";
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
      .then((user) => setCvPct(user ? computeCvProgress(user) : null))
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
  const p = paletteFor(roleEarly);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: p.bg,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${p.accent}25`,
            borderTopColor: p.accent,
            borderRadius: "50%",
            animation: "practix-spin .9s linear infinite",
          }}
        />
        <style>{`@keyframes practix-spin{to{transform:rotate(360deg)}}`}</style>
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
      style={{
        minHeight: "100vh",
        background: p.bg,
        color: p.text,
        display: "flex",
      }}
    >
      <DashboardSidebar
        role={role}
        unreadInbox={unreadCount}
        cvPct={isStudent ? cvPct : null}
        palette={p}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DashboardTopbar
          userName={name}
          userEmail={session.user.email ?? ""}
          userImage={session.user.image}
          isAdmin={isAdmin}
          role={role}
          onMenu={() => setDrawerOpen(true)}
          palette={p}
        />

        <main style={{ flex: 1, position: "relative" }}>{children}</main>
      </div>

      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity .2s",
        }}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,9,9,.4)",
            backdropFilter: "blur(2px)",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Cerrar menú"
        />
        <aside
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "85vw",
            maxWidth: 320,
            background: p.surface,
            boxShadow: "0 24px 64px -12px rgba(20,15,10,0.24)",
            display: "flex",
            flexDirection: "column",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform .25s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 20px 14px",
              borderBottom: `1px solid ${p.border}`,
            }}
          >
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `linear-gradient(135deg,${p.accent},${p.accentHi})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#fff",
                }}
              >
                P
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: p.text,
                  letterSpacing: -0.4,
                }}
              >
                PractiX
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              style={{
                width: 36,
                height: 36,
                border: "none",
                background: "transparent",
                borderRadius: 10,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: p.text,
              }}
              aria-label="Cerrar"
            >
              <Icon name="x" size={18} color={p.text} />
            </button>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${p.border}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar
              ini={initial}
              size={44}
              src={session.user.image}
              alt={name}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: p.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: p.subtle,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {roleLabel}
              </p>
              <p
                style={{
                  fontSize: 11.5,
                  color: p.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 2,
                }}
              >
                {session.user.email}
              </p>
            </div>
          </div>

          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? p.accent : p.muted,
                      background: active ? p.accentBg : "transparent",
                      textDecoration: "none",
                    }}
                  >
                    <Icon
                      name={it.icon}
                      size={17}
                      color={active ? p.accent : p.muted}
                    />
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {badge && (
                      <span
                        style={{
                          background: p.text,
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 7px",
                          borderRadius: 10,
                        }}
                      >
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  marginTop: 4,
                  borderRadius: 10,
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#fff",
                  background: p.text,
                  textDecoration: "none",
                }}
              >
                <Icon name="set" size={16} color="#fff" />
                Panel admin
              </Link>
            )}
          </nav>

          <div
            style={{
              borderTop: `1px solid ${p.border}`,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                color: "#C2410C",
                background: "none",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
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
