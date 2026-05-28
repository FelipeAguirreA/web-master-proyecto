"use client";

import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { EmpresaBlock } from "./EmpresaBlock";
import { MODALITY_LABEL } from "./utils";
import type { Internship } from "./types";

type Props = {
  internships: Internship[];
};

export function EmpresaPracticas({ internships }: Props) {
  const active = internships.filter((i) => i.isActive);
  const sub =
    active.length === 1
      ? "1 oferta activa"
      : `${active.length} ofertas activas`;

  return (
    <EmpresaBlock title="Mis prácticas publicadas" sub={sub}>
      <div className="flex flex-col gap-2">
        {active.length === 0 && (
          <p className="text-[13px] text-subtle italic m-0">
            No tienes prácticas activas todavía.
          </p>
        )}

        {active.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/empresa/ats/${p.id}`}
            className={[
              "grid grid-cols-[1fr_auto] items-center gap-3.5",
              "px-3.5 py-3 rounded-[11px] no-underline transition-colors",
              "bg-dark/[0.025] border-l-[3px] border-l-accent",
              "hover:bg-accent-bg",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="text-[13.5px] font-extrabold text-text leading-[1.3] truncate">
                {p.title}
              </div>
              <div className="flex gap-2 text-[11px] text-subtle flex-wrap mt-0.5">
                <span>{p.area}</span>
                <span>· {MODALITY_LABEL[p.modality]}</span>
                <span>· {p.duration}</span>
              </div>
            </div>
            <Icon name="arr" size={14} color="currentColor" strokeWidth={2.2} />
          </Link>
        ))}

        <Link
          href="/dashboard/empresa"
          className={[
            "mt-1.5 px-2.5 py-2.5 min-h-[44px]",
            "bg-transparent border border-dashed border-border",
            "text-muted rounded-[10px] text-[12.5px] font-bold",
            "inline-flex items-center justify-center gap-1.5 no-underline",
            "hover:bg-accent-bg hover:border-accent-bdr hover:text-accent transition-colors",
          ].join(" ")}
        >
          Publicar prácticas desde el dashboard →
        </Link>
      </div>
    </EmpresaBlock>
  );
}
