import type { CSSProperties } from "react";

type ScoreVisProps = {
  score: number;
  style?: "ring" | "bar" | "badge";
  size?: number;
  label?: boolean;
};

/** Score → tono semántico (green / amber / rose). Decide qué CSS vars del
 *  @theme usar para el color principal y el fondo. */
function scoreVariant(score: number): "green" | "amber" | "rose" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "rose";
}

export function ScoreVis({
  score,
  style = "ring",
  size = 68,
  label = true,
}: ScoreVisProps) {
  const variant = scoreVariant(score);
  const cssVars = {
    "--score-c": `var(--color-${variant})`,
    "--score-bg": `var(--color-${variant}-bg)`,
  } as CSSProperties;

  if (style === "ring") {
    const R = (size - 10) / 2;
    const CIRC = 2 * Math.PI * R;
    const off = CIRC - (CIRC * score) / 100;

    return (
      <div
        className="relative flex-shrink-0"
        style={{
          ...cssVars,
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke="var(--score-c)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={off}
            className="[transition:stroke-dashoffset_0.8s_cubic-bezier(0.16,1,0.3,1)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={[
              "font-black tracking-[-0.6px] text-text leading-none",
              size > 56 ? "text-[20px]" : "text-[16px]",
            ].join(" ")}
          >
            {score}
          </span>
          {label && size > 56 && (
            <span className="text-[9px] text-subtle font-bold tracking-[0.4px] mt-px">
              MATCH
            </span>
          )}
        </div>
      </div>
    );
  }

  if (style === "bar") {
    return (
      <div className="flex-shrink-0 min-w-[96px]" style={cssVars}>
        <div className="flex items-baseline gap-1 mb-[6px]">
          <span className="text-[22px] font-black text-text tracking-[-0.8px] leading-none">
            {score}
          </span>
          <span className="text-[11px] text-subtle font-semibold">/100</span>
        </div>
        <div className="h-[6px] bg-black/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full [background:linear-gradient(90deg,var(--score-c),var(--color-accent-hi))]"
            style={{ width: `${score}%` }}
          />
        </div>
        {label && (
          <p className="text-[10px] text-subtle font-bold tracking-[0.4px] mt-[5px]">
            MATCH SEMÁNTICO
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[12px] bg-[var(--score-bg)] border border-[var(--score-c)]/25"
      style={cssVars}
    >
      <span className="w-[7px] h-[7px] rounded-full bg-[var(--score-c)]" />
      <span className="text-[18px] font-black tracking-[-0.4px] text-[var(--score-c)] leading-none">
        {score}
      </span>
      {label && (
        <span className="text-[10.5px] text-muted font-bold tracking-[0.4px]">
          MATCH
        </span>
      )}
    </div>
  );
}
