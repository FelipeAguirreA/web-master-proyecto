"use client";

import { D } from "../dashboard/tokens";
import { Icon } from "../dashboard/Icon";

export type CompletenessItem = {
  key: string;
  title: string;
  body?: string;
  done: boolean;
  pts: number;
};

type Props = {
  items: CompletenessItem[];
};

export function CompletenessCard({ items }: Props) {
  const totalPts = items.reduce((sum, i) => sum + i.pts, 0);
  const earnedPts = items
    .filter((i) => i.done)
    .reduce((sum, i) => sum + i.pts, 0);
  const pct = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;

  return (
    <section
      style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.3,
          }}
        >
          Tu perfil al {pct}%
        </h3>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: D.muted,
            background: D.bg,
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          {earnedPts}/{totalPts} pts
        </span>
      </div>

      <div
        style={{
          height: 6,
          background: "rgba(0,0,0,.05)",
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg,${D.accent},${D.accentHi})`,
            borderRadius: 99,
            transition: "width .6s cubic-bezier(.16,1,.3,1)",
          }}
        />
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        {items.map((c) => (
          <li
            key={c.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 10px",
              background: c.done ? D.greenBg : D.bg,
              border: `1px solid ${c.done ? "transparent" : D.border}`,
              borderRadius: 9,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: c.done ? D.green : D.surface,
                border: `1px solid ${c.done ? "transparent" : D.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {c.done ? (
                <Icon name="check" size={10} color="#fff" strokeWidth={3} />
              ) : (
                <Icon name="plus" size={10} color={D.muted} />
              )}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 11.5,
                color: c.done ? D.muted : D.text,
                fontWeight: 600,
                textDecoration: c.done ? "line-through" : "none",
                lineHeight: 1.35,
              }}
            >
              {c.title}
            </span>
            {!c.done && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: D.accent,
                  background: D.accentBg,
                  padding: "2px 6px",
                  borderRadius: 5,
                }}
              >
                +{c.pts}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
