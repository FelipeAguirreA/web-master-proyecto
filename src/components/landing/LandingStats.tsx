import { Counter } from "./Counter";

const ITEMS = [
  { n: 12300, suf: "+", label: "Estudiantes activos", note: "en Chile" },
  {
    n: 240,
    suf: "+",
    label: "Empresas publicando",
    note: "prácticas activas hoy",
  },
  {
    n: 4.9,
    suf: "★",
    label: "Rating promedio",
    note: "de 1.230 reseñas",
    dec: 1,
  },
  {
    n: 2.8,
    suf: "s",
    label: "Análisis de CV",
    note: "parsing + scoring + ranking",
    dec: 1,
  },
];

export function LandingStats() {
  return (
    <section className="bg-bg py-[72px] px-4 sm:px-6 md:px-8 border-b border-border">
      <div className="max-w-[1000px] mx-auto grid grid-cols-2 sm:grid-cols-4">
        {ITEMS.map((it, i) => (
          <div
            key={i}
            className={`rv d${i + 1} text-center py-7 px-5${i < 3 ? " border-r border-border [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r" : ""}`}
          >
            <div className="text-[clamp(2.2rem,4.5vw,3.4rem)] font-black tracking-[-2px] text-accent leading-none">
              <Counter to={it.n} suf={it.suf} dec={it.dec || 0} />
            </div>
            <div className="text-[14.5px] font-bold text-text mt-[9px] mb-1">
              {it.label}
            </div>
            <div className="text-xs text-subtle">{it.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
