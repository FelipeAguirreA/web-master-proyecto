import Link from "next/link";
import { ScoreVis } from "@/components/dashboard/atoms/ScoreVis";
import { Icon } from "@/components/dashboard/Icon";
import type { InternshipDetail } from "./types";
import type { Session } from "next-auth";

interface DetailSidebarProps {
  internship: InternshipDetail;
  modeLabel: string;
  session: Session | null;
  matchScore: number | null;
  topLabel: string | null;
  applied: boolean;
  wasAlreadyApplied: boolean;
  applying: boolean;
  applyError: string;
  saved: boolean;
  shareLabel: string;
  onApply: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

export function DetailSidebar({
  internship,
  modeLabel,
  session,
  matchScore,
  topLabel,
  applied,
  wasAlreadyApplied,
  applying,
  applyError,
  saved,
  shareLabel,
  onApply,
  onToggleSave,
  onShare,
}: DetailSidebarProps) {
  const scoreColor =
    matchScore !== null
      ? matchScore >= 80
        ? "text-green"
        : matchScore >= 50
          ? "text-amber"
          : "text-rose"
      : "";

  const scoreLabel =
    matchScore !== null
      ? matchScore >= 80
        ? "Excelente match"
        : matchScore >= 50
          ? "Match medio"
          : "Match bajo"
      : "";

  return (
    <aside className="lg:sticky lg:top-[110px] flex flex-col gap-4">
      {/* Apply card */}
      <div className="bg-surface border border-border rounded-[16px] p-[18px] flex flex-col gap-[14px]">
        {/* Match score row */}
        {matchScore !== null ? (
          <div className="flex items-center gap-[14px]">
            <ScoreVis score={matchScore} style="ring" size={72} label={false} />
            <div>
              <div
                className={`text-[11px] font-extrabold tracking-[0.6px] uppercase ${scoreColor}`}
              >
                {scoreLabel}
              </div>
              <div className="text-[13px] text-muted font-semibold leading-[1.4] mt-[2px]">
                {topLabel
                  ? `${topLabel} de candidatos para esta práctica.`
                  : "Tu CV calza con esta práctica."}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-[14px] py-3 bg-bg border border-dashed border-border rounded-[11px] text-[12px] text-muted leading-[1.5]">
            {session?.user.role === "STUDENT" ? (
              <>
                Sin match calculado para esta práctica.{" "}
                <Link href="/perfil" className="text-accent font-bold">
                  Sube tu CV
                </Link>{" "}
                para verlo.
              </>
            ) : (
              <>
                <Link
                  href="/login?role=student"
                  className="text-accent font-bold"
                >
                  Inicia sesión
                </Link>{" "}
                como estudiante para ver tu match.
              </>
            )}
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-[10px] py-3 border-t border-b border-border">
          {[
            { l: "Modalidad", v: modeLabel },
            { l: "Duración", v: internship.duration },
            { l: "Ubicación", v: internship.location },
            { l: "Área", v: internship.area },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-[10.5px] font-bold text-subtle tracking-[0.4px] uppercase">
                {s.l}
              </div>
              <div className="text-[13px] font-bold text-text mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
                {s.v}
              </div>
            </div>
          ))}
        </div>

        {/* Apply button / applied state */}
        {applied ? (
          <div className="px-[14px] py-3 bg-green-bg border border-green/25 rounded-[11px] text-[13px] text-green font-bold flex items-center gap-2 leading-[1.5]">
            <Icon name="check" size={16} color="currentColor" strokeWidth={3} />
            {wasAlreadyApplied
              ? "Ya postulaste a esta práctica"
              : "¡Postulación enviada!"}
          </div>
        ) : (
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="min-h-[44px] w-full px-4 py-[13px] bg-gradient-to-br from-text to-[#222] text-white border-none rounded-[11px] text-[14px] font-extrabold cursor-pointer shadow-[0_10px_28px_-10px_var(--color-text),0_3px_10px_rgba(255,106,61,.2)] disabled:opacity-70 disabled:cursor-wait font-[inherit] transition-opacity"
          >
            {applying
              ? "Postulando…"
              : session
                ? "Postular ahora"
                : "Iniciar sesión para postular"}
          </button>
        )}

        {/* Apply error */}
        {applyError && (
          <p className="text-[12px] text-rose font-semibold px-[10px] py-2 bg-rose-bg rounded-[8px] border border-rose/25">
            {applyError}
          </p>
        )}

        {/* Save + Share row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleSave}
            className={[
              "flex-1 min-h-[44px] p-[10px] rounded-[10px] text-[12px] font-bold inline-flex items-center justify-center gap-[6px] cursor-pointer font-[inherit] transition-colors",
              saved
                ? "bg-accent-bg border border-accent-bdr text-accent"
                : "bg-black/[.04] border-none text-text",
            ].join(" ")}
          >
            <Icon
              name="heart"
              size={14}
              color={saved ? "currentColor" : "var(--color-muted)"}
            />
            {saved ? "Guardada" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex-1 min-h-[44px] p-[10px] bg-black/[.04] border-none rounded-[10px] text-[12px] font-bold text-text cursor-pointer inline-flex items-center justify-center gap-[6px] font-[inherit] hover:bg-black/[.07] transition-colors"
          >
            <Icon name="send" size={14} color="var(--color-muted)" />
            {shareLabel}
          </button>
        </div>

        {/* Hint text */}
        {session?.user.role === "STUDENT" && !applied && (
          <p className="text-[11.5px] text-subtle leading-[1.5] text-center">
            Postular toma <b className="text-muted">~2 min</b> · tu CV está
            pre-cargado.
          </p>
        )}
      </div>

      {/* Why this match card */}
      {matchScore !== null && (
        <div className="bg-surface border border-border rounded-[16px] p-[18px]">
          <h3 className="text-[13.5px] font-extrabold text-text tracking-[-0.2px] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-[7px] bg-accent-bg flex items-center justify-center shrink-0">
              <Icon name="spark" size={13} color="var(--color-accent)" />
            </span>
            Por qué tienes este match
          </h3>
          <p className="text-[12.5px] text-muted leading-[1.6]">
            Tu match es <b className="text-text">{matchScore}</b> porque la IA
            comparó el contenido de tu CV con los requisitos y descripción de
            esta práctica. Skills clave que detectamos:{" "}
            {internship.skills.slice(0, 3).join(", ") || "ninguna específica"}.
          </p>
        </div>
      )}
    </aside>
  );
}
