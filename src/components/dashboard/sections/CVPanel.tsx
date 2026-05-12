import Link from "next/link";
import { D } from "../tokens";
import { Icon } from "../Icon";
import { ScoreVis } from "../atoms/ScoreVis";

export type CVTip = {
  title: string;
  body: string;
  pts: string;
  done: boolean;
};

export function CVPanel({ cvPct, tips }: { cvPct: number; tips: CVTip[] }) {
  return (
    <section
      style={{
        background: `linear-gradient(135deg,${D.cream}, #fff)`,
        border: `1px solid ${D.accentBdr}`,
        borderRadius: 18,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          background: `radial-gradient(circle, ${D.accent}25, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <ScoreVis score={cvPct} style="ring" size={70} label={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                color: D.text,
                letterSpacing: -0.3,
              }}
            >
              Tu CV
            </h3>
            <p
              style={{
                fontSize: 12,
                color: D.muted,
                lineHeight: 1.5,
                marginTop: 2,
              }}
            >
              {cvPct >= 90 ? (
                <>Tu CV está en el top. Excelente trabajo.</>
              ) : cvPct === 0 ? (
                <>
                  <Link
                    href="/perfil"
                    style={{ color: D.accent, fontWeight: 700 }}
                  >
                    Sube tu CV
                  </Link>{" "}
                  para empezar a recibir matches.
                </>
              ) : (
                <>
                  Súbelo a <b style={{ color: D.accent }}>92%</b> para entrar al
                  top de Falabella.
                </>
              )}
            </p>
          </div>
        </div>
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            listStyle: "none",
            padding: 0,
          }}
        >
          {tips.map((t, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 11px",
                background: t.done ? D.greenBg : D.surface,
                border: `1px solid ${t.done ? "transparent" : D.border}`,
                borderRadius: 11,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: t.done ? D.green : D.surface,
                  border: `1px solid ${t.done ? "transparent" : D.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {t.done ? (
                  <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                ) : (
                  <Icon name="plus" size={11} color={D.muted} />
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: t.done ? D.muted : D.text,
                    textDecoration: t.done ? "line-through" : "none",
                    lineHeight: 1.3,
                  }}
                >
                  {t.title}
                </div>
                {!t.done && (
                  <div
                    style={{
                      fontSize: 11,
                      color: D.subtle,
                      marginTop: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {t.body}
                  </div>
                )}
              </div>
              {!t.done && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: D.accent,
                    background: D.accentBg,
                    padding: "2px 7px",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  {t.pts}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
