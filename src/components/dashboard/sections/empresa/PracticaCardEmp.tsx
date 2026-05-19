import type { CSSProperties } from "react";
import Link from "next/link";
import { Icon } from "@/components/dashboard/Icon";
import { publishedAgo, MODALITY_LABEL } from "./utils";
import type { Internship, StageCounts } from "./types";

type PracticaCardEmpProps = {
  p: Internship;
  stages?: StageCounts;
  busy: boolean;
  onAskFinalize: (id: string) => void;
  onAskDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

export function PracticaCardEmp({
  p,
  stages,
  busy,
  onAskFinalize,
  onAskDelete,
  onEdit,
}: PracticaCardEmpProps) {
  const s = stages ?? {
    nuevos: 0,
    screening: 0,
    entrev: 0,
    ofertas: 0,
    total: 0,
  };

  // Los colores de los stages usan CSS vars del @theme para que la paleta
  // empresa (data-palette="company") los sobreescriba automáticamente.
  const stagesArr = [
    { k: "Nuevos", v: s.nuevos, color: "var(--color-accent)" },
    { k: "Revisión", v: s.screening, color: "var(--color-blue)" },
    { k: "Entrevista", v: s.entrev, color: "var(--color-purple)" },
    { k: "Oferta", v: s.ofertas, color: "var(--color-green)" },
  ];
  const max = Math.max(1, ...stagesArr.map((x) => x.v));

  const isDeleted = !!p.deletedAt;
  const chipClass = isDeleted
    ? "text-rose bg-rose-bg"
    : p.isActive
      ? "text-green bg-green-bg"
      : "text-subtle bg-black/5";
  const chipLabel = isDeleted
    ? "Eliminada"
    : p.isActive
      ? "Activa"
      : "Finalizada";

  return (
    <article
      className={[
        "bg-surface border border-border rounded-[16px] p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-150",
        // Visual diferencial para eliminadas: opacidad reducida + sin sombras
        // sutiles. Sigue siendo legible para auditar el historial.
        isDeleted && "opacity-60 grayscale-[0.4]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      <header className="flex justify-between gap-2.5">
        <div className="min-w-0">
          {/* Chips: status + area + fecha */}
          <div className="flex gap-1.5 items-center mb-1 flex-wrap">
            <span
              className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-[5px] tracking-[0.4px] uppercase ${chipClass}`}
            >
              {chipLabel}
            </span>
            <span className="text-[10.5px] text-subtle">· {p.area}</span>
            <span
              className="text-[10.5px] text-subtle"
              title={new Date(p.createdAt).toLocaleString("es-CL")}
            >
              · Publicado {publishedAgo(p.createdAt)}
            </span>
          </div>
          <Link
            href={`/practicas/${p.id}`}
            className="text-[14.5px] font-extrabold text-text tracking-[-0.3px] leading-snug no-underline block break-words [overflow-wrap:anywhere]"
          >
            {p.title}
          </Link>
          <p className="text-[11.5px] text-muted mt-0.5">
            {MODALITY_LABEL[p.modality]} · {p.duration} · {p.location}
          </p>
        </div>
      </header>

      {/* Stage grid: 2 cols mobile, 4 cols lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stagesArr.map((st) => (
          <div key={st.k} className="min-w-0">
            <div className="text-[10px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-1">
              {st.k}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-[19px] font-black tracking-[-0.5px] leading-none"
                style={
                  {
                    color: st.v > 0 ? st.color : "var(--color-faint)",
                  } as CSSProperties
                }
              >
                {st.v}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="h-[3px] bg-black/[0.06] rounded-sm mt-1.5 overflow-hidden">
              <div
                className="h-full rounded-sm transition-[width] duration-500"
                style={
                  {
                    width: `${(st.v / max) * 100}%`,
                    background: st.color,
                  } as CSSProperties
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="flex flex-col gap-2 border-t border-border pt-2.5">
        <div className="flex justify-between items-center text-[11.5px]">
          <div className="flex gap-3 text-muted">
            <span>
              <b className="text-text">{s.total}</b> total
            </span>
            {s.nuevos > 0 && (
              <span className="text-accent font-bold">{s.nuevos} nuevos</span>
            )}
          </div>
          <Link
            href={`/practicas/${p.id}`}
            className="text-muted font-bold no-underline"
          >
            Ver publicación
          </Link>
        </div>

        <div className="flex gap-1.5 items-stretch flex-wrap">
          {/* Postulantes: siempre visible — el ATS sirve para revisar
              historial incluso de prácticas eliminadas (audit trail). */}
          <Link
            href={`/dashboard/empresa/ats/${p.id}`}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5
                       px-2.5 py-2 bg-accent-bg text-accent rounded-lg text-[11.5px] font-bold no-underline whitespace-nowrap"
          >
            <Icon name="user" size={12} color="var(--color-accent)" />
            Postulantes
          </Link>

          {/* Editar: deshabilitado si hay postulantes (no se puede cambiar lo
              que ellos vieron al postular) o si está eliminada. */}
          {!isDeleted &&
            (() => {
              const canEdit = s.total === 0;
              const tooltip = canEdit
                ? "Editar práctica"
                : `No podés editar: ya hay ${s.total} ${s.total === 1 ? "postulante" : "postulantes"}`;
              return (
                <button
                  type="button"
                  disabled={busy || !canEdit}
                  onClick={() => canEdit && onEdit(p.id)}
                  title={tooltip}
                  aria-label={tooltip}
                  className={[
                    "flex-1 min-w-0 inline-flex items-center justify-center gap-1.5",
                    "px-2.5 py-2 bg-blue-bg text-blue rounded-lg text-[11.5px] font-bold whitespace-nowrap",
                    !canEdit || busy
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  <Icon name="edit" size={12} color="var(--color-blue)" />
                  Editar
                </button>
              );
            })()}

          {p.isActive && !isDeleted && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAskFinalize(p.id)}
              title="Finalizar"
              className={[
                "flex-1 min-w-0 inline-flex items-center justify-center gap-1.5",
                "px-2.5 py-2 bg-green-bg text-green rounded-lg text-[11.5px] font-bold whitespace-nowrap",
                busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              <Icon name="check" size={12} color="var(--color-green)" />
              Finalizar
            </button>
          )}
          {!isDeleted && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAskDelete(p.id)}
              title="Eliminar"
              className={[
                "flex-1 min-w-0 inline-flex items-center justify-center gap-1.5",
                "px-2.5 py-2 bg-rose-bg text-rose rounded-lg text-[11.5px] font-bold whitespace-nowrap",
                busy ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              <Icon name="x" size={12} color="var(--color-rose)" />
              Eliminar
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
