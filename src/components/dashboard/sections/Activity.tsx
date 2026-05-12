import type { ReactNode } from "react";
import { D } from "../tokens";

export type ActivityItem = {
  id: string;
  icon: string;
  color: string;
  bg: string;
  text: ReactNode;
  when: string;
};

export function Activity({ items }: { items: ActivityItem[] }) {
  return (
    <section
      style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 18,
        padding: 18,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: D.text,
          letterSpacing: -0.3,
          marginBottom: 14,
        }}
      >
        Actividad reciente
      </h3>
      {items.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: D.subtle,
            lineHeight: 1.5,
          }}
        >
          Cuando pase algo importante con tus postulaciones, lo vas a ver acá.
        </p>
      ) : (
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            listStyle: "none",
            padding: 0,
          }}
        >
          {items.map((a) => (
            <li
              key={a.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: a.bg,
                  color: a.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {a.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12.5,
                    color: D.text,
                    lineHeight: 1.45,
                  }}
                >
                  {a.text}
                </p>
                <p
                  style={{
                    fontSize: 10.5,
                    color: D.subtle,
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  {a.when}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
