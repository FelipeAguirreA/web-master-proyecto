"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "../Icon";
import { CoLogo } from "../atoms/CoLogo";
import { ScoreVis } from "../atoms/ScoreVis";
import { Tag } from "../atoms/Tag";
import { companyColor, companyInitials } from "../companyColors";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

/**
 * Badges de estado — clases Tailwind en lugar de valores D.xxx hardcoded.
 * Usan tokens @theme para ser palette-aware.
 */
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-accent-bg text-accent",
  },
  REVIEWED: {
    label: "En revisión",
    className: "bg-blue-bg text-blue",
  },
  ACCEPTED: {
    label: "Aceptada",
    className: "bg-green-bg text-green",
  },
  REJECTED: {
    label: "Rechazada",
    className: "bg-rose-bg text-rose",
  },
};

/**
 * Color del punto dentro del badge de estado — para los que lo necesitan.
 * No todos tienen punto; para los que sí, el color coincide con el texto.
 */
const STATUS_DOT_CLASS: Record<string, string> = {
  PENDING: "bg-accent",
  REVIEWED: "bg-blue",
  ACCEPTED: "bg-green",
  REJECTED: "bg-rose",
};

const PIPELINE_BADGE: Record<string, { label: string; className: string }> = {
  REVIEWING: { label: "En revisión", className: "bg-blue-bg text-blue" },
  INTERVIEW: { label: "Entrevista", className: "bg-accent-bg text-accent" },
};

type ApplicationModalData = {
  id: string;
  status: string;
  pipelineStatus?: string | null;
  matchScore?: number | null;
  createdAt: string;
  internship: {
    id: string;
    title: string;
    description?: string | null;
    area?: string | null;
    location?: string | null;
    modality?: string | null;
    duration?: string | null;
    requirements?: string[] | null;
    skills?: string[] | null;
    company: { companyName: string; logo?: string | null };
  };
};

export function ApplicationDetailModal({
  application,
  onClose,
}: {
  application: ApplicationModalData;
  onClose: () => void;
}) {
  useEffect(() => {
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
  }, [onClose]);

  const co = application.internship.company.companyName;
  const color = companyColor(co);
  const score = Math.round(application.matchScore ?? 0);
  const statusBadge = STATUS_BADGE[application.status];
  const statusDot = STATUS_DOT_CLASS[application.status];
  const pipelineBadge = application.pipelineStatus
    ? PIPELINE_BADGE[application.pipelineStatus]
    : null;
  const dateLabel = new Date(application.createdAt).toLocaleDateString(
    "es-CL",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    /* Backdrop — bottom sheet en mobile, centrado en sm+ */
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[4px] flex justify-center items-end sm:items-center p-0 sm:p-4"
    >
      {/* Card — bottom sheet en mobile, modal en sm+ */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface shadow-[0_24px_64px_-12px_rgba(20,15,10,0.35)] w-full max-w-[720px] overflow-hidden flex flex-col rounded-t-[24px] sm:rounded-[24px] rounded-b-none sm:rounded-b-[24px] max-h-[calc(100dvh-80px)] sm:max-h-[90vh]"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-surface/95 backdrop-blur-[8px] border-b border-border px-[22px] py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="flex gap-3 items-center min-w-0">
            <CoLogo
              logo={companyInitials(co)}
              logoUrl={application.internship.company.logo}
              logoBg={color.bg}
              logoFg={color.fg}
              size={44}
            />
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold text-text tracking-[-0.4px] leading-[1.2] line-clamp-2 break-words [overflow-wrap:anywhere]">
                {application.internship.title}
              </h2>
              <p className="text-[12.5px] text-muted mt-0.5">{co}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 inline-flex items-center justify-center rounded-[10px] text-muted hover:bg-bg transition-colors cursor-pointer border-none bg-transparent shrink-0"
            aria-label="Cerrar"
          >
            <Icon name="x" size={18} color="currentColor" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-[22px] py-5 pb-6 flex flex-col gap-5">
          {/* Score + badges */}
          <div className="flex items-center gap-3.5 flex-wrap">
            {score > 0 && (
              <ScoreVis score={score} style="ring" size={64} label />
            )}
            <div className="flex gap-2 flex-wrap flex-1">
              {statusBadge && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-[11px] py-[5px] rounded-full ${statusBadge.className}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                  {statusBadge.label}
                </span>
              )}
              {pipelineBadge && (
                <span
                  className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-[11px] py-[5px] rounded-full ${pipelineBadge.className}`}
                >
                  {pipelineBadge.label}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted bg-bg px-[11px] py-[5px] rounded-full">
                <Icon name="cal" size={12} color="var(--color-subtle)" />
                Postulada el {dateLabel}
              </span>
            </div>
          </div>

          {/* Info chips — ya migrado en fix anterior, se mantiene */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {application.internship.location && (
              <InfoChip
                icon="pin"
                label="Ubicación"
                value={application.internship.location}
              />
            )}
            {application.internship.modality && (
              <InfoChip
                icon="briefc"
                label="Modalidad"
                value={
                  MODALITY_LABEL[application.internship.modality] ??
                  application.internship.modality
                }
              />
            )}
            {application.internship.area && (
              <InfoChip
                icon="doc"
                label="Área"
                value={application.internship.area}
              />
            )}
            {application.internship.duration && (
              <InfoChip
                icon="clock"
                label="Duración"
                value={application.internship.duration}
              />
            )}
          </div>

          {/* Skills */}
          {(application.internship.skills?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-[11px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-2.5">
                Habilidades requeridas
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {(application.internship.skills ?? []).map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
          )}

          {/* Requisitos */}
          {(application.internship.requirements?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-[11px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-2.5">
                Requisitos
              </h3>
              <ul className="list-none p-0 flex flex-col gap-[7px]">
                {(application.internship.requirements ?? []).map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-[9px] text-[13px] text-text leading-[1.55] break-words [overflow-wrap:anywhere]"
                  >
                    <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-green-bg inline-flex items-center justify-center mt-px">
                      <Icon
                        name="check"
                        size={10}
                        color="var(--color-green)"
                        strokeWidth={3}
                      />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Descripción */}
          {application.internship.description && (
            <div>
              <h3 className="text-[11px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-2.5">
                Descripción
              </h3>
              <p className="text-[13.5px] text-text leading-[1.65] whitespace-pre-wrap">
                {application.internship.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer sticky */}
        <div className="border-t border-border px-[22px] py-3.5 flex justify-end gap-2.5 bg-bg shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-[18px] py-2.5 rounded-[11px] border border-border bg-surface text-[13px] font-semibold text-muted cursor-pointer"
          >
            Cerrar
          </button>
          <Link
            href={`/practicas/${application.internship.id}`}
            className="inline-flex items-center gap-[7px] px-[18px] py-2.5 rounded-[11px] bg-gradient-to-br from-accent to-accent-hi text-white text-[13px] font-bold no-underline shadow-[0_6px_18px_color-mix(in_srgb,var(--color-accent)_33%,transparent)]"
          >
            Ver práctica completa
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-bg border border-border rounded-[12px]">
      <span className="w-[30px] h-[30px] rounded-[8px] bg-accent-bg inline-flex items-center justify-center shrink-0">
        <Icon name={icon} size={14} color="var(--color-accent)" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-subtle tracking-[0.5px] uppercase">
          {label}
        </div>
        <div className="text-[12.5px] text-text font-semibold mt-px truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
