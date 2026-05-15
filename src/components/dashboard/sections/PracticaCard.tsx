import Link from "next/link";
import { D } from "../tokens";
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
      className="practix-pcard"
      style={{
        background: D.surface,
        border: `1px solid ${featured ? D.accentBdr : D.border}`,
        borderRadius: 18,
        padding: 20,
        position: "relative",
        transition: "all .2s",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {p.isNew && (
        <span
          style={{
            position: "absolute",
            top: -1,
            right: 14,
            background: D.accent,
            color: "#fff",
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: 0.6,
            padding: "3px 9px",
            borderRadius: "0 0 8px 8px",
          }}
        >
          NUEVO
        </span>
      )}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <CoLogo
          logo={p.logo}
          logoUrl={p.logoUrl}
          logoBg={p.logoBg}
          logoFg={p.logoFg}
          size={44}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: D.muted,
                letterSpacing: 0.2,
              }}
            >
              {p.co}
            </span>
            {p.top && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  background: D.accentBg,
                  color: D.accent,
                  padding: "2px 7px",
                  borderRadius: 5,
                  letterSpacing: 0.3,
                }}
              >
                {p.top}
              </span>
            )}
          </div>
          <h3
            style={{
              fontSize: 15.5,
              fontWeight: 700,
              color: D.text,
              letterSpacing: -0.3,
              lineHeight: 1.25,
            }}
          >
            {p.title}
          </h3>
        </div>
      </header>

      {p.description && (
        <p
          style={{
            fontSize: 12.5,
            color: D.muted,
            lineHeight: 1.55,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {p.description}
        </p>
      )}

      {p.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {p.tags.slice(0, 4).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 12,
          color: D.muted,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="pin" size={13} color={D.subtle} />
          {p.mode}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="briefc" size={13} color={D.subtle} />
          {p.dur}
        </span>
        {p.salary && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontWeight: 700,
              color: D.text,
            }}
          >
            {p.salary}
          </span>
        )}
      </div>

      {featured && p.ai && (
        <div
          style={{
            background: `linear-gradient(135deg,${D.accentBg},#fff)`,
            border: `1px solid ${D.accentBdr}`,
            borderRadius: 12,
            padding: "11px 14px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: 7,
              background: D.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 6px ${D.accent}30`,
            }}
          >
            <Icon name="spark" size={12} color={D.accent} />
          </span>
          <p
            style={{
              fontSize: 12,
              color: D.text,
              lineHeight: 1.55,
            }}
          >
            <b style={{ color: D.accent }}>Por qué te elegimos:</b> {p.ai}
          </p>
        </div>
      )}

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {p.applied ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: D.accentBg,
                color: D.accent,
                padding: "6px 11px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              <Icon name="check" size={12} color={D.accent} />
              Postulación enviada
            </span>
          ) : (
            <>
              <ScoreVis score={p.score} style="ring" size={56} label={false} />
              <div>
                {p.applicants !== null && p.applicants !== undefined && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: D.muted,
                      fontWeight: 600,
                    }}
                  >
                    {p.applicants} postulantes
                  </div>
                )}
                {p.deadline && (
                  <div
                    style={{
                      fontSize: 11,
                      color: D.accent,
                      fontWeight: 700,
                    }}
                  >
                    {p.deadline}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Link
          href={`/practicas/${p.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: p.applied ? "transparent" : D.text,
            color: p.applied ? D.text : "#fff",
            border: p.applied ? `1px solid ${D.border}` : "none",
            padding: "9px 14px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}
        >
          {p.applied ? "Ver detalle" : "Ver"}
        </Link>
      </footer>
      <style>{`
        .practix-pcard:hover { border-color: ${D.accentBdr}; box-shadow: 0 14px 38px -16px ${D.accent}33; }
      `}</style>
    </article>
  );
}
