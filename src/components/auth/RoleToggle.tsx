"use client";

type Role = "student" | "company";

type Props = {
  role: Role;
  onChange: (r: Role) => void;
};

export function RoleToggle({ role, onChange }: Props) {
  return (
    <div className="inline-flex gap-0.5 rounded-[30px] bg-dark/[0.04] p-1">
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
            className={`min-h-[36px] rounded-[30px] px-4 py-1.5 text-[12.5px] font-bold transition-all ${
              active
                ? "bg-surface text-text shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                : "bg-transparent text-muted"
            }`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
