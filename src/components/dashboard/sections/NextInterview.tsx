import Link from "next/link";
import { D } from "../tokens";
import { Icon } from "../Icon";
import { CoLogo } from "../atoms/CoLogo";

export type InterviewData = {
  applicationId: string;
  internshipId: string;
  co: string;
  logo: string;
  logoUrl?: string | null;
  logoBg: string;
  logoFg: string;
  role: string;
  duration?: string | null;
  whenLabel: string;
  timeLabel?: string | null;
  channelLabel?: string | null;
  meetingLink?: string | null;
};

export function NextInterview({
  interview,
}: {
  interview: InterviewData | null;
}) {
  if (!interview) {
    return (
      <section
        style={{
          background: D.surface,
          border: `1px solid ${D.border}`,
          borderRadius: 18,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: D.accentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cal" size={15} color={D.accent} />
          </span>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: D.text,
              letterSpacing: -0.3,
            }}
          >
            Sin entrevistas próximas
          </h3>
        </div>
        <p
          style={{
            fontSize: 12,
            color: D.muted,
            lineHeight: 1.5,
          }}
        >
          Cuando una empresa te agende una entrevista, vas a verla acá.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: D.dark,
        color: "#fff",
        borderRadius: 18,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: -40,
          right: -30,
          width: 180,
          height: 180,
          background: `radial-gradient(circle, ${D.accent}40, transparent 60%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: D.accent,
              animation: "pulseDot 1.5s ease infinite",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              color: D.accentHi,
              textTransform: "uppercase",
            }}
          >
            Próxima entrevista
          </span>
        </div>
        {/* Header clickeable → detalle de la práctica.
            Fecha (whenLabel) a la izquierda de la flecha. */}
        <Link
          href={`/practicas/${interview.internshipId}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
            textDecoration: "none",
            color: "inherit",
            borderRadius: 10,
            padding: "4px 0",
          }}
          aria-label={`Ver detalle de ${interview.role} en ${interview.co}`}
        >
          <CoLogo
            logo={interview.logo}
            logoUrl={interview.logoUrl}
            logoBg={interview.logoBg}
            logoFg={interview.logoFg}
            size={42}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: 15.5,
                fontWeight: 800,
                letterSpacing: -0.3,
              }}
            >
              {interview.co}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.6)",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {interview.role}
              {interview.duration ? ` · ${interview.duration}` : ""}
            </p>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,.7)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {interview.whenLabel}
          </span>
          <Icon name="arr" size={14} color="rgba(255,255,255,.45)" sw={2.2} />
        </Link>
        {(interview.timeLabel || interview.channelLabel) && (
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "10px 12px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 11,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {interview.timeLabel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Icon name="clock" size={13} color="rgba(255,255,255,.7)" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {interview.timeLabel}
                </span>
              </div>
            )}
            {interview.channelLabel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Icon name="video" size={13} color="rgba(255,255,255,.7)" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {interview.channelLabel}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
