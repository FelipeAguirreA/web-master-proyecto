import type { TabKey } from "./types";

interface StatItem {
  label: string;
  count: number;
  desc: string;
  colorClass: string;
}

interface Props {
  counts: Record<TabKey, number>;
}

export function StatsBar({ counts }: Props) {
  const stats: StatItem[] = [
    {
      label: "En revisión",
      count: counts.PENDING,
      desc: "Esperan tu decisión",
      colorClass: "text-amber",
    },
    {
      label: "Aprobadas",
      count: counts.APPROVED,
      desc: "Activas en la plataforma",
      colorClass: "text-green",
    },
    {
      label: "Rechazadas",
      count: counts.REJECTED,
      desc: "No pueden publicar",
      colorClass: "text-muted",
    },
    {
      label: "Suspendidas",
      count: counts.SUSPENDED,
      desc: "Bloqueadas temporalmente",
      colorClass: "text-rose",
    },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-surface border border-border rounded-[13px] px-4 py-3.5"
        >
          <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase">
            {s.label}
          </div>
          <div className="text-[26px] font-black text-text tracking-[-1px] leading-none mt-1">
            {s.count}
          </div>
          <div className={`text-[11px] font-bold mt-1 ${s.colorClass}`}>
            {s.desc}
          </div>
        </div>
      ))}
    </section>
  );
}
