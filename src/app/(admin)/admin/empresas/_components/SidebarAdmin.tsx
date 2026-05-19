import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";

interface Props {
  pendingCount: number;
}

export function SidebarAdmin({ pendingCount }: Props) {
  return (
    <aside className="hidden md:flex w-[232px] bg-surface border-r border-border flex-col gap-[18px] shrink-0 sticky top-0 h-screen overflow-y-auto p-[18px_14px]">
      {/* Logo / marca */}
      <Link
        href="/"
        className="flex items-center gap-[9px] px-1.5 py-1 no-underline"
      >
        <span className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-dark to-accent flex items-center justify-center text-white font-black text-sm shrink-0">
          P
        </span>
        <span className="text-[15px] font-extrabold text-text tracking-[-0.3px]">
          PractiX{" "}
          <span className="text-[9px] font-extrabold text-white bg-dark py-[2px] px-[5px] rounded ml-[3px] tracking-[0.4px]">
            ADMIN
          </span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        <span className="relative flex items-center gap-[11px] px-2.5 py-[7px] rounded-[9px] text-accent bg-accent-bg text-[13px] font-bold">
          {/* Indicador activo */}
          <span className="absolute -left-[14px] top-1.5 bottom-1.5 w-[3px] rounded-r-[3px] bg-accent" />
          <Icon name="briefc" size={17} color="currentColor" />
          <span className="flex-1">Empresas</span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-extrabold text-white bg-accent px-[6px] py-[1px] rounded-[7px]">
              {pendingCount}
            </span>
          )}
        </span>
      </nav>

      {/* Panel de estado */}
      <div className="mt-auto p-3.5 bg-gradient-to-br from-dark to-[#1B2C56] text-white rounded-[14px]">
        <p className="text-[10.5px] font-extrabold tracking-[0.5px] text-white/50 uppercase mb-1.5">
          Hoy
        </p>
        <p className="text-[12.5px] text-white leading-[1.5] mb-2.5 font-semibold">
          {pendingCount === 0
            ? "Sin empresas esperando revisión."
            : pendingCount === 1
              ? "1 empresa espera tu revisión."
              : `${pendingCount} empresas esperan tu revisión.`}
        </p>
      </div>
    </aside>
  );
}
