"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { pickInitials } from "./utils";

interface Props {
  adminName: string;
  adminEmail: string;
  adminImage?: string | null;
  pendingCount: number;
}

export function TopbarAdmin({
  adminName,
  adminEmail,
  adminImage,
  pendingCount,
}: Props) {
  const ini = pickInitials(adminName);

  return (
    <header className="flex items-center gap-3.5 px-4 sm:px-[22px] py-3.5 bg-surface border-b border-border sticky top-0 z-30">
      {/* Marca (solo mobile, el sidebar la muestra en md+) */}
      <Link
        href="/"
        className="flex md:hidden items-center gap-2 no-underline shrink-0"
      >
        <span className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-dark to-accent flex items-center justify-center text-white font-black text-sm">
          P
        </span>
        <span className="text-[13px] font-extrabold text-text tracking-tight">
          PractiX{" "}
          <span className="text-[9px] font-extrabold text-white bg-dark py-[2px] px-[5px] rounded ml-0.5 tracking-[0.4px]">
            ADMIN
          </span>
        </span>
      </Link>

      {/* Etiqueta panel interno */}
      <div className="hidden sm:flex items-center gap-2.5">
        <span className="text-[10.5px] font-extrabold text-dark bg-dark/8 px-[9px] py-[3px] rounded-[5px] tracking-[0.5px] uppercase">
          Panel interno
        </span>
        <span className="text-xs text-subtle">Solo equipo PractiX</span>
      </div>

      {/* Badge pendientes mobile */}
      {pendingCount > 0 && (
        <span className="md:hidden text-[10px] font-extrabold text-white bg-amber px-2 py-[2px] rounded-full">
          {pendingCount} pend.
        </span>
      )}

      {/* Acciones — derecha */}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark/[0.045] text-text text-xs font-bold no-underline min-h-[44px] md:min-h-0"
        >
          <Icon name="home" size={13} color="currentColor" strokeWidth={2.2} />
          <span className="hidden sm:inline">Volver al dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Cerrar sesión"
          className="px-3 py-2 rounded-lg bg-dark/[0.045] border-none cursor-pointer text-muted text-xs font-bold min-h-[44px] md:min-h-0"
        >
          <span className="hidden sm:inline">Cerrar sesión</span>
          <span className="sm:hidden">
            <Icon name="x" size={14} color="currentColor" />
          </span>
        </button>
        <div className="flex items-center gap-[9px] pl-1 pr-[11px] py-1 bg-dark/[0.045] rounded-full">
          <Avatar ini={ini} size={30} src={adminImage} alt={adminName} />
          <div className="hidden sm:block leading-[1.2]">
            <div className="text-xs font-bold text-text">{adminName}</div>
            <div className="text-[10px] text-subtle">{adminEmail}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
