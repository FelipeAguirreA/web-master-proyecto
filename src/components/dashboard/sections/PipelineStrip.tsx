import { D } from "../tokens";
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

const STAGE_COLOR: Record<PipelineColumn["stage"], string> = {
  Postulé: D.subtle,
  "En revisión": D.amber,
  Entrevista: D.accent,
  Oferta: D.green,
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
      <div
        className="practix-pipeline-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
        }}
      >
        {columns.map((col) => (
          <div
            key={col.stage}
            style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 16,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 160,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: STAGE_COLOR[col.stage],
                  }}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: D.text,
                    letterSpacing: 0.2,
                    textTransform: "uppercase",
                  }}
                >
                  {col.stage}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: D.muted,
                  background: "rgba(0,0,0,.04)",
                  padding: "2px 7px",
                  borderRadius: 6,
                }}
              >
                {col.count}
              </span>
            </div>
            {col.items.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11.5,
                  color: D.faint,
                  fontStyle: "italic",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Sin postulaciones aún
              </div>
            ) : (
              col.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onItemClick?.(it.id)}
                  className="practix-pipeline-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: 8,
                    background: D.bg,
                    borderRadius: 10,
                    transition: "background .15s",
                    cursor: "pointer",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <CoLogo
                    logo={it.logo}
                    logoUrl={it.logoUrl}
                    logoBg={it.logoBg}
                    logoFg={it.logoFg}
                    size={28}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: D.text,
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {it.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: col.stage === "Entrevista" ? D.accent : D.subtle,
                        fontWeight: col.stage === "Entrevista" ? 700 : 500,
                        marginTop: 1,
                      }}
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
      <style>{`
        .practix-pipeline-item:hover { background: ${D.accentBg} !important; }
        @media (max-width:900px) { .practix-pipeline-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width:600px) { .practix-pipeline-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
