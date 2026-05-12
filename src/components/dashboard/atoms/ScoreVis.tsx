import { D } from "../tokens";

type ScoreVisProps = {
  score: number;
  style?: "ring" | "bar" | "badge";
  size?: number;
  label?: boolean;
};

export function ScoreVis({
  score,
  style = "ring",
  size = 68,
  label = true,
}: ScoreVisProps) {
  const c = score >= 80 ? D.green : score >= 50 ? D.amber : D.rose;
  const bg = score >= 80 ? D.greenBg : score >= 50 ? D.amberBg : D.roseBg;

  if (style === "ring") {
    const R = (size - 10) / 2;
    const CIRC = 2 * Math.PI * R;
    const off = CIRC - (CIRC * score) / 100;
    return (
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke="rgba(0,0,0,.06)"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke={c}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={off}
            style={{
              transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: size > 56 ? 20 : 16,
              fontWeight: 900,
              letterSpacing: -0.6,
              color: D.text,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          {label && size > 56 && (
            <span
              style={{
                fontSize: 9,
                color: D.subtle,
                fontWeight: 700,
                letterSpacing: 0.4,
                marginTop: 1,
              }}
            >
              MATCH
            </span>
          )}
        </div>
      </div>
    );
  }

  if (style === "bar") {
    return (
      <div style={{ flexShrink: 0, minWidth: 96 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: D.text,
              letterSpacing: -0.8,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span style={{ fontSize: 11, color: D.subtle, fontWeight: 600 }}>
            /100
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "rgba(0,0,0,.05)",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${score}%`,
              background: `linear-gradient(90deg,${c},${D.accentHi})`,
              borderRadius: 99,
            }}
          />
        </div>
        {label && (
          <p
            style={{
              fontSize: 10,
              color: D.subtle,
              fontWeight: 700,
              letterSpacing: 0.4,
              marginTop: 5,
            }}
          >
            MATCH SEMÁNTICO
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: bg,
        border: `1px solid ${c}25`,
        padding: "7px 12px",
        borderRadius: 12,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: c,
        }}
      />
      <span
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: c,
          letterSpacing: -0.4,
          lineHeight: 1,
        }}
      >
        {score}
      </span>
      {label && (
        <span
          style={{
            fontSize: 10.5,
            color: D.muted,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          MATCH
        </span>
      )}
    </div>
  );
}
