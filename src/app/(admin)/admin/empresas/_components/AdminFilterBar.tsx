import { Icon } from "@/components/dashboard/Icon";
import type { TabKey } from "./types";

interface Tab {
  k: TabKey;
  l: string;
  colorClass: string;
}

const TABS: Tab[] = [
  { k: "PENDING", l: "Pendientes", colorClass: "bg-amber" },
  { k: "APPROVED", l: "Aprobadas", colorClass: "bg-green" },
  { k: "REJECTED", l: "Rechazadas", colorClass: "bg-rose" },
  { k: "SUSPENDED", l: "Suspendidas", colorClass: "bg-muted" },
];

interface Props {
  tab: TabKey;
  counts: Record<TabKey, number>;
  q: string;
  onTabChange: (t: TabKey) => void;
  onSearchChange: (v: string) => void;
}

export function AdminFilterBar({
  tab,
  counts,
  q,
  onTabChange,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3 py-2.5 border-b border-border">
      {/* Tabs */}
      <div className="flex gap-0.5 bg-dark/[0.04] p-[3px] rounded-[9px] overflow-x-auto w-full sm:w-auto">
        {TABS.map((tb) => {
          const active = tab === tb.k;
          return (
            <button
              type="button"
              key={tb.k}
              onClick={() => onTabChange(tb.k)}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-[6px] rounded-[7px] text-[11.5px] font-extrabold whitespace-nowrap cursor-pointer border-none transition-colors",
                active
                  ? "bg-surface text-text shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                  : "bg-transparent text-muted",
              ].join(" ")}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tb.colorClass}`} />
              {tb.l}
              <span
                className={[
                  "text-[10px] font-extrabold px-[6px] py-[1px] rounded-[5px]",
                  active
                    ? `${tb.colorClass} text-white opacity-90`
                    : "bg-dark/[0.06] text-subtle",
                ].join(" ")}
              >
                {counts[tb.k]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative w-full sm:max-w-[300px]">
        <span className="absolute left-[11px] top-1/2 -translate-y-1/2 flex pointer-events-none">
          <Icon name="search" size={14} color="var(--color-subtle)" />
        </span>
        <input
          id="admin-empresas-search"
          name="admin-empresas-search"
          type="search"
          role="searchbox"
          aria-label="Buscar empresa, RUT, email o industria"
          autoComplete="off"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar empresa, RUT, email o industria…"
          className="w-full bg-dark/[0.045] border border-transparent rounded-lg py-[7px] pl-8 pr-3 text-xs text-text outline-none focus:border-accent/30 focus:bg-surface transition-colors"
        />
      </div>
    </div>
  );
}
