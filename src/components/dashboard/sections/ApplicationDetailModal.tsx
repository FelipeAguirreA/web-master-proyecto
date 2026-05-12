"use client";

import { useEffect } from "react";
import Link from "next/link";
import { D } from "../tokens";
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

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> =
  {
    PENDING: { label: "Pendiente", bg: D.accentBg, fg: D.accent },
    REVIEWED: { label: "En revisión", bg: D.blueBg, fg: D.blue },
    ACCEPTED: { label: "Aceptada", bg: D.greenBg, fg: D.green },
    REJECTED: { label: "Rechazada", bg: D.roseBg, fg: D.rose },
  };

const PIPELINE_BADGE: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  REVIEWING: { label: "En revisión", bg: D.blueBg, fg: D.blue },
  INTERVIEW: { label: "Entrevista", bg: D.accentBg, fg: D.accent },
};

export type ApplicationModalData = {
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
  const pipelineBadge = application.pipelineStatus
    ? PIPELINE_BADGE[application.pipelineStatus]
    : null;
  const dateLabel = new Date(application.createdAt).toLocaleDateString(
    "es-CL",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(10,9,9,.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: D.surface,
          borderRadius: 24,
          boxShadow: "0 24px 64px -12px rgba(20,15,10,0.35)",
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "rgba(255,255,255,.95)",
            backdropFilter: "blur(8px)",
            borderBottom: `1px solid ${D.border}`,
            padding: "16px 22px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <CoLogo
              logo={companyInitials(co)}
              logoUrl={application.internship.company.logo}
              logoBg={color.bg}
              logoFg={color.fg}
              size={44}
            />
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: D.text,
                  letterSpacing: -0.4,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {application.internship.title}
              </h2>
              <p
                style={{
                  fontSize: 12.5,
                  color: D.muted,
                  marginTop: 2,
                }}
              >
                {co}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              background: "transparent",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: D.muted,
              flexShrink: 0,
            }}
            aria-label="Cerrar"
          >
            <Icon name="x" size={18} color={D.muted} />
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            padding: "20px 22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {score > 0 && (
              <ScoreVis score={score} style="ring" size={64} label />
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                flex: 1,
              }}
            >
              {statusBadge && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: statusBadge.bg,
                    color: statusBadge.fg,
                    padding: "5px 11px",
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: statusBadge.fg,
                    }}
                  />
                  {statusBadge.label}
                </span>
              )}
              {pipelineBadge && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: pipelineBadge.bg,
                    color: pipelineBadge.fg,
                    padding: "5px 11px",
                    borderRadius: 999,
                  }}
                >
                  {pipelineBadge.label}
                </span>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: D.muted,
                  background: D.bg,
                  padding: "5px 11px",
                  borderRadius: 999,
                }}
              >
                <Icon name="cal" size={12} color={D.subtle} />
                Postulada el {dateLabel}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
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

          {(application.internship.skills?.length ?? 0) > 0 && (
            <div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: D.subtle,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Habilidades requeridas
              </h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(application.internship.skills ?? []).map((s) => (
                  <Tag key={s}>{s}</Tag>
                ))}
              </div>
            </div>
          )}

          {(application.internship.requirements?.length ?? 0) > 0 && (
            <div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: D.subtle,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Requisitos
              </h3>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                {(application.internship.requirements ?? []).map((r) => (
                  <li
                    key={r}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 13,
                      color: D.text,
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: D.greenBg,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      <Icon
                        name="check"
                        size={10}
                        color={D.green}
                        strokeWidth={3}
                      />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {application.internship.description && (
            <div>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: D.subtle,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Descripción
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: D.text,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}
              >
                {application.internship.description}
              </p>
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: `1px solid ${D.border}`,
            padding: "14px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            background: D.bg,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 11,
              border: `1px solid ${D.border}`,
              background: D.surface,
              fontSize: 13,
              fontWeight: 600,
              color: D.muted,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
          <Link
            href={`/practicas/${application.internship.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              borderRadius: 11,
              background: `linear-gradient(135deg,${D.accent},${D.accentHi})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: `0 6px 18px ${D.accent}55`,
            }}
          >
            Ver práctica completa →
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: D.bg,
        border: `1px solid ${D.border}`,
        borderRadius: 12,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: D.accentBg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={14} color={D.accent} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: D.subtle,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: D.text,
            fontWeight: 600,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
