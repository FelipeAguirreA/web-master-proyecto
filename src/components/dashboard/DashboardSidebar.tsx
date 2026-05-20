"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  hasCv?: boolean;
};

export function DashboardSidebar({
  role = "STUDENT",
  unreadInbox = 0,
  cvPct = null,
  hasCv = false,
}: Props) {
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
    <aside className="practix-sidebar sticky top-0 self-start w-[232px] h-screen border-r border-border bg-surface flex flex-col shrink-0 hidden md:flex">
      <Link
        href="/"
        className="px-[18px] pt-[18px] pb-[14px] flex items-center gap-[9px] no-underline"
      >
        <div
          className={[
            "w-8 h-8 rounded-[9px] flex items-center justify-center font-[800] text-[14px] text-white shrink-0",
            // Company uses dark→accent gradient, student uses accent→accent-hi
            role === "COMPANY"
              ? "[background:linear-gradient(135deg,var(--color-accent),var(--color-dark))]"
              : "[background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))]",
          ].join(" ")}
          style={{
            boxShadow:
              "0 4px 14px color-mix(in srgb, var(--color-accent) 33%, transparent)",
          }}
        >
          P
        </div>
        <span className="font-[700] text-[15.5px] text-text tracking-[-0.4px] inline-flex items-center gap-[6px]">
          PractiX
          {role === "COMPANY" && (
            <span className="text-[9px] font-[800] text-accent bg-accent-bg px-[5px] py-[2px] rounded-[4px] tracking-[0.4px]">
              EMPRESA
            </span>
          )}
        </span>
      </Link>

      <nav className="px-3 py-2 flex flex-col gap-0.5">
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
              className={[
                "practix-sidebar-item flex items-center gap-3 px-3 py-[9px] rounded-[10px] text-[13.5px] relative transition-all duration-150 no-underline",
                active
                  ? "font-[700] text-accent bg-accent-bg"
                  : "font-[500] text-muted bg-transparent hover:bg-black/[0.04] hover:text-text",
              ].join(" ")}
              data-active={active ? "1" : "0"}
            >
              <Icon
                name={it.icon}
                size={17}
                color={active ? "var(--color-accent)" : "var(--color-muted)"}
              />
              <span className="flex-1">{it.label}</span>
              {badge && (
                <span className="bg-text text-white text-[10px] font-[800] px-[7px] py-[2px] rounded-[10px]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4 pt-[14px]">
        {role === "STUDENT" && (
          <div
            className="border border-accent-bdr rounded-[14px] p-[14px] mb-[10px]"
            style={{
              background: "linear-gradient(135deg,var(--color-accent-bg),#fff)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-6 h-6 rounded-[7px] bg-surface flex items-center justify-center"
                style={{
                  boxShadow:
                    "0 2px 6px color-mix(in srgb, var(--color-accent) 19%, transparent)",
                }}
              >
                <Icon name="spark" size={13} color="var(--color-accent)" />
              </span>
              <span className="text-[10px] font-[800] tracking-[0.6px] text-accent uppercase">
                Tu CV
              </span>
            </div>
            <p className="text-[12px] text-muted leading-[1.55] mb-[9px]">
              {cvPct === null ? (
                "Sube tu CV para empezar a recibir matches."
              ) : cvPct >= 90 ? (
                "Tu CV está en el top. Excelente trabajo."
              ) : (
                <>
                  Súbelo a <b className="text-text">90%+</b> para entrar al top
                  de Falabella y NotCo.
                </>
              )}
            </p>
            <Link
              href="/perfil"
              className="block text-center bg-text text-white text-[12px] font-[700] px-3 py-2 rounded-[9px] no-underline"
            >
              {hasCv ? "Mejorar CV" : "Cargar CV"}
            </Link>
          </div>
        )}
        {role === "COMPANY" && (
          <div
            className="rounded-[14px] p-[14px] text-white relative overflow-hidden mb-[10px]"
            style={{
              background:
                "linear-gradient(135deg,var(--color-dark),var(--color-accent))",
            }}
          >
            {/* Decorative circle */}
            <div className="absolute top-[-30px] right-[-30px] w-20 h-20 bg-white/10 rounded-full" />
            <p className="text-[10.5px] font-[800] tracking-[0.5px] text-white/70 mb-1">
              PLAN GROWTH
            </p>
            <p className="text-[11.5px] font-[600] leading-[1.4] text-white/90 mb-[9px] relative">
              Verifica tu empresa para publicar más prácticas.
            </p>
            <Link
              href="/dashboard/empresa/perfil"
              className="px-[11px] py-[6px] bg-white text-dark border-none rounded-[7px] text-[11.5px] font-[800] cursor-pointer no-underline inline-block"
            >
              Mi empresa
            </Link>
          </div>
        )}
        <Link
          href={role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil"}
          className={[
            "practix-sidebar-item flex items-center gap-[10px] px-3 py-[9px] rounded-[10px] text-[13px] text-muted font-[500] no-underline hover:bg-black/[0.04] hover:text-text",
            pathname ===
            (role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil")
              ? "text-accent bg-accent-bg"
              : "",
          ].join(" ")}
          data-active={
            pathname ===
            (role === "COMPANY" ? "/dashboard/empresa/perfil" : "/perfil")
              ? "1"
              : "0"
          }
        >
          <Icon name="user" size={16} color="var(--color-muted)" />
          Mi perfil
        </Link>
      </div>
    </aside>
  );
}
