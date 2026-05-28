"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/client/logout";
import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { Avatar } from "./atoms/Avatar";

export const STUDENT_DRAWER_ITEMS = [
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

export const COMPANY_DRAWER_ITEMS = [
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

type DrawerItem = {
  icon: "home" | "search" | "heart" | "chat" | "cal" | "user";
  label: string;
  href: string;
  inbox?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: DrawerItem[];
  userName: string;
  userEmail: string;
  userImage?: string | null;
  roleLabel: string;
  isAdmin: boolean;
  unreadCount: number;
};

export function MobileDrawer({
  open,
  onClose,
  items,
  userName,
  userEmail,
  userImage,
  roleLabel,
  isAdmin,
  unreadCount,
}: Props) {
  const pathname = usePathname() ?? "";
  const drawerRef = useRef<HTMLDivElement>(null);
  const initial = userName.charAt(0).toUpperCase();

  // Lock scroll + ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Drop focus al cerrar para evitar warnings de aria-hidden + focused descendant
  useEffect(() => {
    if (open) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && drawerRef.current?.contains(active)) {
      active.blur();
    }
  }, [open]);

  // Best-match active link (más larga gana — distingue /dashboard de /dashboard/inbox)
  let bestHref: string | null = null;
  let bestLen = -1;
  for (const it of items) {
    if (pathname === it.href || pathname.startsWith(`${it.href}/`)) {
      if (it.href.length > bestLen) {
        bestLen = it.href.length;
        bestHref = it.href;
      }
    }
  }

  return (
    <div
      ref={drawerRef}
      className="fixed inset-0 z-60 transition-opacity duration-200"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 border-none cursor-pointer"
        style={{ background: "rgba(10,9,9,.4)", backdropFilter: "blur(2px)" }}
        aria-label="Cerrar menú"
      />

      {/* Drawer panel */}
      <aside
        className="absolute left-0 top-0 h-full w-[85vw] max-w-[320px] bg-surface flex flex-col transition-transform duration-[250ms] ease-out"
        style={{
          boxShadow: "0 24px 64px -12px rgba(20,15,10,0.24)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-[18px] pb-[14px] border-b border-border">
          <Link
            href="/"
            onClick={onClose}
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
            onClick={onClose}
            className="w-9 h-9 border-none bg-transparent rounded-[10px] cursor-pointer inline-flex items-center justify-center text-text"
            aria-label="Cerrar"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Avatar ini={initial} size={44} src={userImage} alt={userName} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-[700] text-text truncate">
              {userName}
            </p>
            <p className="text-[11px] text-subtle uppercase tracking-[0.8px] font-[700] mt-0.5">
              {roleLabel}
            </p>
            <p className="text-[11.5px] text-muted truncate mt-0.5">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {items.map((it) => {
            const active = it.href === bestHref;
            const badge =
              it.inbox && unreadCount > 0 ? String(unreadCount) : null;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onClose}
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
          {isAdmin && (
            <Link
              href="/admin/empresas"
              onClick={onClose}
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
              onClose();
              logout();
            }}
            className="flex items-center gap-3 px-3 py-[10px] rounded-[10px] text-[13.5px] font-[500] text-[#C2410C] bg-transparent border-none cursor-pointer w-full text-left"
          >
            <Icon name="x" size={16} color="#C2410C" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );
}
