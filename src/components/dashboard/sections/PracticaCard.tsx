import Link from "next/link";
import { Icon } from "../Icon";
import { CoLogo } from "../atoms/CoLogo";
import { Tag } from "../atoms/Tag";
import { ScoreVis } from "../atoms/ScoreVis";

export type PracticaCardData = {
  id: string;
  co: string;
  logo: string;
  logoUrl?: string | null;
  logoBg: string;
  logoFg: string;
  title: string;
  description?: string | null;
  mode: string;
  salary?: string | null;
  dur: string;
  score: number;
  top?: string | null;
  tags: string[];
  deadline?: string | null;
  applicants?: number | null;
  isNew?: boolean;
  ai?: string | null;
  applied?: boolean;
};

type Props = {
  p: PracticaCardData;
  featured?: boolean;
};

export function PracticaCard({ p, featured = false }: Props) {
  return (
    <article
      className={[
        "group relative flex flex-col gap-3.5 p-5 rounded-[18px] bg-surface transition-all duration-200",
        "border hover:shadow-[0_14px_38px_-16px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]",
        featured
          ? "border-accent-bdr"
          : "border-border hover:border-accent-bdr",
      ].join(" ")}
    >
      {/* Badge NUEVO */}
      {p.isNew && (
        <span className="absolute -top-px right-3.5 bg-accent text-white text-[9.5px] font-extrabold tracking-[0.6px] px-[9px] py-[3px] rounded-b-[8px]">
          NUEVO
        </span>
      )}

      {/* Header: logo + empresa + título */}
      <header className="flex items-start gap-3">
        <CoLogo
          logo={p.logo}
          logoUrl={p.logoUrl}
          logoBg={p.logoBg}
          logoFg={p.logoFg}
          size={44}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[12px] font-bold text-muted tracking-[0.2px]">
              {p.co}
            </span>
            {p.top && (
              <span className="text-[10px] font-semibold bg-accent-bg text-accent px-[7px] py-0.5 rounded-[5px] tracking-[0.3px]">
                {p.top}
              </span>
            )}
          </div>
          <h3 className="text-[15.5px] font-bold text-text tracking-[-0.3px] leading-[1.25]">
            {p.title}
          </h3>
        </div>
      </header>

      {/* Descripción */}
      {p.description && (
        <p className="text-[12.5px] text-muted leading-[1.55] m-0 line-clamp-2">
          {p.description}
        </p>
      )}

      {/* Tags */}
      {p.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {p.tags.slice(0, 4).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      {/* Meta: modalidad + duración + salario */}
      <div className="flex items-center gap-3.5 text-[12px] text-muted flex-wrap">
        <span className="inline-flex items-center gap-[5px]">
          <Icon name="pin" size={13} color="var(--color-subtle)" />
          {p.mode}
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <Icon name="briefc" size={13} color="var(--color-subtle)" />
          {p.dur}
        </span>
        {p.salary && (
          <span className="inline-flex items-center gap-[5px] font-bold text-text">
            {p.salary}
          </span>
        )}
      </div>

      {/* AI insight (solo featured) */}
      {featured && p.ai && (
        <div className="bg-gradient-to-br from-accent-bg to-surface border border-accent-bdr rounded-[12px] p-3 flex gap-2.5 items-start">
          <span className="shrink-0 w-[22px] h-[22px] rounded-[7px] bg-surface flex items-center justify-center shadow-[0_2px_6px_color-mix(in_srgb,var(--color-accent)_19%,transparent)]">
            <Icon name="spark" size={12} color="var(--color-accent)" />
          </span>
          <p className="text-[12px] text-text leading-[1.55]">
            <b className="text-accent">Por qué te elegimos:</b> {p.ai}
          </p>
        </div>
      )}

      {/* Footer: score + CTA */}
      <footer className="flex items-center justify-between gap-2.5 mt-auto pt-1">
        <div className="flex items-center gap-2.5">
          {p.applied ? (
            <span className="inline-flex items-center gap-1.5 bg-accent-bg text-accent px-[11px] py-[6px] rounded-[8px] text-[11.5px] font-bold tracking-[0.2px]">
              <Icon name="check" size={12} color="currentColor" />
              Postulación enviada
            </span>
          ) : (
            <>
              <ScoreVis score={p.score} style="ring" size={56} label={false} />
              <div>
                {p.applicants != null && (
                  <div className="text-[11.5px] text-muted font-semibold">
                    {p.applicants} postulantes
                  </div>
                )}
                {p.deadline && (
                  <div className="text-[11px] text-accent font-bold">
                    {p.deadline}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Link
          href={`/practicas/${p.id}`}
          className={[
            "inline-flex items-center gap-[5px] px-3.5 py-[9px] rounded-[10px] text-[12.5px] font-bold whitespace-nowrap no-underline",
            p.applied
              ? "bg-transparent text-text border border-border"
              : "bg-text text-white border-none",
          ].join(" ")}
        >
          {p.applied ? "Ver detalle" : "Ver"}
        </Link>
      </footer>
    </article>
  );
}
