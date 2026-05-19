import { CoLogo } from "../atoms/CoLogo";
import { SectionHead } from "./SectionHead";

export type PipelineItem = {
  id: string;
  co: string;
  logo: string;
  logoUrl?: string | null;
  logoBg: string;
  logoFg: string;
  title: string;
  ago: string;
};

export type PipelineColumn = {
  stage: "Postulé" | "En revisión" | "Entrevista" | "Oferta";
  count: number;
  items: PipelineItem[];
};

/**
 * Clases Tailwind para el punto de color de cada columna.
 * Genuinamente estático — no depende de props dinámicas.
 */
const STAGE_DOT_CLASS: Record<PipelineColumn["stage"], string> = {
  Postulé: "bg-subtle",
  "En revisión": "bg-amber",
  Entrevista: "bg-accent",
  Oferta: "bg-green",
};

export function PipelineStrip({
  columns,
  onItemClick,
}: {
  columns: PipelineColumn[];
  onItemClick?: (id: string) => void;
}) {
  return (
    <section id="postulaciones">
      <SectionHead
        title="Mis postulaciones"
        sub="Pipeline de tus prácticas activas"
      />
      {/* Mobile: 2 cols / Desktop: 4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {columns.map((col) => (
          <div
            key={col.stage}
            className="bg-surface border border-border rounded-[16px] p-3.5 flex flex-col gap-2.5 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[7px]">
                <span
                  className={`w-[7px] h-[7px] rounded-full ${STAGE_DOT_CLASS[col.stage]}`}
                />
                <span className="text-[11.5px] font-extrabold text-text tracking-[0.2px] uppercase">
                  {col.stage}
                </span>
              </div>
              <span className="text-[11px] font-extrabold text-muted bg-black/[.04] py-0.5 px-[7px] rounded-[6px]">
                {col.count}
              </span>
            </div>

            {col.items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[11.5px] text-faint italic text-center leading-[1.5]">
                Sin postulaciones aún
              </div>
            ) : (
              col.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onItemClick?.(it.id)}
                  className="group flex items-center gap-[9px] p-2 bg-bg hover:bg-accent-bg rounded-[10px] transition-colors duration-150 cursor-pointer border-none w-full text-left font-[inherit]"
                >
                  <CoLogo
                    logo={it.logo}
                    logoUrl={it.logoUrl}
                    logoBg={it.logoBg}
                    logoFg={it.logoFg}
                    size={28}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold text-text leading-[1.25] truncate">
                      {it.title}
                    </div>
                    <div
                      className={[
                        "text-[10.5px] mt-px font-medium",
                        col.stage === "Entrevista"
                          ? "text-accent font-bold"
                          : "text-subtle",
                      ].join(" ")}
                    >
                      {it.ago}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
