"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { paletteFor, type Palette } from "./palettes";
import { Icon } from "./Icon";

type IconName = Parameters<typeof Icon>[0]["name"];

type NavItem = {
  icon: IconName;
  label: string;
  href: string;
  badge?: string;
  matchPrefix?: string;
};

const STUDENT_NAV: NavItem[] = [
  { icon: "home", label: "Inicio", href: "/dashboard/estudiante" },
  { icon: "search", label: "Prácticas", href: "/practicas" },
  {
    icon: "heart",
    label: "Guardadas",
    href: "/practicas/guardadas",
  },
  {
    icon: "flag",
    label: "Mis postulaciones",
    href: "/dashboard/estudiante#postulaciones",
  },
  {
    icon: "chat",
    label: "Mensajes",
    href: "/dashboard/estudiante/inbox",
  },
  { icon: "cal", label: "Agenda", href: "/dashboard/estudiante#agenda" },
];

const COMPANY_NAV: NavItem[] = [
  { icon: "home", label: "Inicio", href: "/dashboard/empresa" },
  { icon: "search", label: "Prácticas", href: "/practicas" },
  {
    icon: "cal",
    label: "Entrevistas",
    href: "/dashboard/empresa/calendar",
  },
  { icon: "chat", label: "Mensajes", href: "/dashboard/empresa/inbox" },
];

type Props = {
  role?: "STUDENT" | "COMPANY";
  unreadInbox?: number;
  cvPct?: number | null;
  palette?: Palette;
};

export function DashboardSidebar({
  role = "STUDENT",
  unreadInbox = 0,
  cvPct = null,
  palette,
}: Props) {
  const p = palette ?? paletteFor(role);
  const pathname = usePathname();
  const items = role === "COMPANY" ? COMPANY_NAV : STUDENT_NAV;

  const activeHref = (() => {
    let bestHref: string | null = null;
    let bestLen = -1;
    for (const i of items) {
      if (i.href.includes("#")) continue;
      const target = i.matchPrefix ?? i.href;
      if (pathname === target || pathname.startsWith(`${target}/`)) {
        if (target.length > bestLen) {
          bestLen = target.length;
          bestHref = i.href;
        }
      }
    }
    return bestHref;
  })();

  const isActive = (item: NavItem) => item.href === activeHref;

  return (
    <aside
      className="practix-sidebar"
      style={{
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        width: 232,
        height: "100vh",
        borderRight: `1px solid ${p.border}`,
        background: p.surface,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        style={{
          padding: "18px 18px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background:
              role === "COMPANY"
                ? `linear-gradient(135deg,${p.accent},${p.dark})`
                : `linear-gradient(135deg,${p.accent},${p.accentHi})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            color: "#fff",
            boxShadow: `0 4px 14px ${p.accent}55`,
            flexShrink: 0,
          }}
        >
          P
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 15.5,
            color: p.text,
            letterSpacing: -0.4,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          PractiX
          {role === "COMPANY" && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: p.accent,
                background: p.accentBg,
                padding: "2px 5px",
                borderRadius: 4,
                letterSpacing: 0.4,
              }}
            >
              EMPRESA
            </span>
          )}
        </span>
      </Link>

      <nav
        style={{
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {items.map((it) => {
          const active = isActive(it);
          const badge =
            it.label === "Mensajes" && unreadInbox > 0
              ? String(unreadInbox)
              : it.badge;
          return (
            <Link
              key={it.label}
              href={it.href}
              className="practix-sidebar-item"
              data-active={active ? "1" : "0"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 12px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: active ? 700 : 500,
                color: active ? p.accent : p.muted,
                background: active ? p.accentBg : "transparent",
                position: "relative",
                transition: "all .15s",
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
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: "14px 12px 16px",
        }}
      >
        {role === "STUDENT" && (
          <div
            style={{
              background: `linear-gradient(135deg,${p.accentBg},#fff)`,
              border: `1px solid ${p.accentBdr}`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: p.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 2px 6px ${p.accent}30`,
                }}
              >
                <Icon name="spark" size={13} color={p.accent} />
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  color: p.accent,
                  textTransform: "uppercase",
                }}
              >
                Tu CV
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: p.muted,
                lineHeight: 1.55,
                marginBottom: 9,
              }}
            >
              {cvPct === null ? (
                "Sube tu CV para empezar a recibir matches."
              ) : cvPct >= 90 ? (
                "Tu CV está en el top. Excelente trabajo."
              ) : (
                <>
                  Súbelo a <b style={{ color: p.text }}>90%+</b> para entrar al
                  top de Falabella y NotCo.
                </>
              )}
            </p>
            <Link
              href="/perfil"
              style={{
                display: "block",
                textAlign: "center",
                background: p.text,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 9,
                textDecoration: "none",
              }}
            >
              {cvPct === null ? "Subir CV" : "Mejorar CV"}
            </Link>
          </div>
        )}
        {role === "COMPANY" && (
          <div
            style={{
              background: `linear-gradient(135deg, ${p.dark}, ${p.accent})`,
              borderRadius: 14,
              padding: 14,
              color: "#fff",
              position: "relative",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 80,
                height: 80,
                background: "rgba(255,255,255,.1)",
                borderRadius: "50%",
              }}
            />
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: 0.5,
                color: "rgba(255,255,255,.7)",
                marginBottom: 4,
              }}
            >
              PLAN GROWTH
            </p>
            <p
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1.4,
                color: "rgba(255,255,255,.9)",
                marginBottom: 9,
                position: "relative",
              }}
            >
              Verifica tu empresa para publicar más prácticas.
            </p>
            <Link
              href="/dashboard/empresa/perfil"
              style={{
                padding: "6px 11px",
                background: "#fff",
                color: p.dark,
                border: "none",
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Mi empresa
            </Link>
          </div>
        )}
        <Link
          href={role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil"}
          className="practix-sidebar-item"
          data-active={
            pathname ===
            (role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil")
              ? "1"
              : "0"
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 10,
            fontSize: 13,
            color: p.muted,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          <Icon name="user" size={16} color={p.muted} />
          Mi perfil
        </Link>
      </div>
      <style>{`
        .practix-sidebar-item[data-active="0"]:hover { background: rgba(15,23,42,.04); color: ${p.text}; }
        .practix-sidebar-item[data-active="0"]:hover svg { stroke: ${p.text}; }
        @media (max-width:900px) {
          .practix-sidebar { display: none !important; }
        }
      `}</style>
    </aside>
  );
}
