"use client";

import { A } from "./tokens";

type Role = "student" | "company";

type Props = {
  role: Role;
  onChange: (r: Role) => void;
};

export function RoleToggle({ role, onChange }: Props) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "rgba(0,0,0,.04)",
        padding: 4,
        borderRadius: 30,
        gap: 2,
      }}
    >
      {[
        { v: "student" as const, l: "Soy estudiante" },
        { v: "company" as const, l: "Soy empresa" },
      ].map((o) => {
        const active = role === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              padding: "7px 16px",
              borderRadius: 30,
              fontSize: 12.5,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: active ? A.surface : "transparent",
              color: active ? A.text : A.muted,
              boxShadow: active ? "0 2px 6px rgba(0,0,0,.06)" : "none",
              transition: "all .15s",
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
