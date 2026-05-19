import type { CSSProperties } from "react";

const COMPANIES = [
  { name: "Falabella", ini: "F", c: "#007A33", tc: "#fff" },
  { name: "NotCo", ini: "N", c: "#1A1A1A", tc: "#fff" },
  { name: "Fintual", ini: "FT", c: "#4B1AF5", tc: "#fff" },
  { name: "Cornershop", ini: "CS", c: "#FF5A00", tc: "#fff" },
  { name: "Bci", ini: "B", c: "#0033A0", tc: "#fff" },
  { name: "Entel", ini: "E", c: "#00A8E0", tc: "#fff" },
  { name: "Buk", ini: "BK", c: "#FF3366", tc: "#fff" },
  { name: "Betterfly", ini: "BF", c: "#5B21B6", tc: "#fff" },
  { name: "Mercado Libre", ini: "ML", c: "#FFE600", tc: "#111" },
  { name: "Ripley", ini: "R", c: "#D4003E", tc: "#fff" },
  { name: "WOM", ini: "W", c: "#B400FF", tc: "#fff" },
  { name: "Cencosud", ini: "CC", c: "#E30613", tc: "#fff" },
];

export function LandingLogoWall() {
  const all = [...COMPANIES, ...COMPANIES];
  return (
    <div className="bg-surface border-b border-border py-8 overflow-hidden">
      <p className="text-center text-[10.5px] font-bold tracking-[2.2px] uppercase text-subtle mb-6">
        Empresas con prácticas activas
      </p>
      <div className="relative">
        {/* fade left */}
        <div className="absolute left-0 top-0 bottom-0 w-[120px] bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
        {/* fade right */}
        <div className="absolute right-0 top-0 bottom-0 w-[120px] bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />
        <div className="flex gap-[10px] w-max [animation:marquee_40s_linear_infinite]">
          {all.map((co, i) => (
            <div
              key={i}
              className="flex items-center gap-[9px] bg-surface border border-border rounded-xl px-[17px] py-[9px] shrink-0 transition-[border-color,box-shadow] duration-200 hover:border-border-hi hover:shadow-[0_4px_16px_rgba(0,0,0,.07)]"
            >
              <span
                className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[9px] font-extrabold shrink-0"
                style={{ background: co.c, color: co.tc } as CSSProperties}
              >
                {co.ini}
              </span>
              <span className="text-[13px] font-semibold text-text whitespace-nowrap">
                {co.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
