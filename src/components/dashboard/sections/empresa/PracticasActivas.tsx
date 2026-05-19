"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { CardSkeleton } from "./CardSkeleton";
import { PracticaCardEmp } from "./PracticaCardEmp";
import {
  getInternshipTab,
  type Internship,
  type InternshipTab,
  type StageCounts,
} from "./types";

type PracticasActivasProps = {
  internships: Internship[];
  stageCounts: Record<string, StageCounts>;
  loading: boolean;
  onPublish: () => void;
  onAskFinalize: (id: string) => void;
  onAskDelete: (id: string) => void;
  onEdit: (id: string) => void;
  processingId: string | null;
};

const TABS: { key: InternshipTab; label: string }[] = [
  { key: "activas", label: "Activas" },
  { key: "finalizadas", label: "Finalizadas" },
  { key: "eliminadas", label: "Eliminadas" },
];

export function PracticasActivas({
  internships,
  stageCounts,
  loading,
  onPublish,
  onAskFinalize,
  onAskDelete,
  onEdit,
  processingId,
}: PracticasActivasProps) {
  const [tab, setTab] = useState<InternshipTab>("activas");

  // Particiona la lista por tab UNA vez, así contamos y filtramos sin recorrer
  // tres veces el array.
  const buckets = useMemo(() => {
    const out: Record<InternshipTab, Internship[]> = {
      activas: [],
      finalizadas: [],
      eliminadas: [],
    };
    for (const i of internships) out[getInternshipTab(i)].push(i);
    return out;
  }, [internships]);

  if (loading) return <CardSkeleton label="Cargando prácticas…" />;

  // Empty state: cero prácticas en TODO (ni activas, ni finalizadas, ni eliminadas).
  if (internships.length === 0) {
    return (
      <section className="bg-surface border border-dashed border-border-hi rounded-[18px] p-7 sm:p-8 text-center">
        <span className="inline-flex w-12 h-12 rounded-[12px] bg-accent-bg text-accent items-center justify-center mb-3">
          <Icon name="briefc" size={22} color="var(--color-accent)" />
        </span>
        <h3 className="text-[16px] font-extrabold text-text tracking-[-0.4px]">
          Publica tu primera práctica
        </h3>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed max-w-[380px] mx-auto mb-4">
          Los estudiantes top de Chile están esperando ofertas como las tuyas.
        </p>
        <button
          type="button"
          onClick={onPublish}
          className="px-4 py-2.5 bg-gradient-to-br from-accent to-accent-hi text-white rounded-[11px] text-[13px] font-extrabold cursor-pointer
                     shadow-[0_6px_16px_color-mix(in_srgb,var(--color-accent)_27%,transparent)]"
        >
          Publicar práctica
        </button>
      </section>
    );
  }

  const currentList = buckets[tab];
  const totalNuevos = buckets.activas.reduce(
    (acc, i) => acc + (stageCounts[i.id]?.nuevos ?? 0),
    0,
  );

  return (
    <section>
      <header className="flex items-center justify-between mb-3 gap-2.5 flex-wrap">
        <div>
          <h2 className="text-[15px] font-extrabold text-text tracking-[-0.3px]">
            Mis prácticas
          </h2>
          <p className="text-[11.5px] text-subtle mt-0.5">
            {buckets.activas.length}{" "}
            {buckets.activas.length === 1 ? "activa" : "activas"}
            {totalNuevos > 0 &&
              ` · ${totalNuevos} postulantes nuevos por revisar`}
          </p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          className="px-2.5 py-1.5 bg-accent text-white rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Icon name="plus" size={12} color="#fff" />
          Nueva
        </button>
      </header>

      {/* Tabs nav */}
      <div
        role="tablist"
        aria-label="Estado de prácticas"
        className="flex gap-1 mb-3 bg-black/[0.04] p-1 rounded-[10px] w-fit"
      >
        {TABS.map((t) => {
          const count = buckets[t.key].length;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.key)}
              className={[
                "px-3 py-1.5 rounded-[7px] text-[12px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5",
                isActive
                  ? "bg-surface text-text shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "text-muted hover:text-text",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "text-[10.5px] font-extrabold px-1.5 py-px rounded-[5px] tabular-nums",
                  isActive
                    ? "bg-accent-bg text-accent"
                    : "bg-black/[0.06] text-subtle",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state por tab */}
      {currentList.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-[16px] p-6 text-center text-[12.5px] text-muted">
          {tab === "activas" && "No tienes prácticas activas en este momento."}
          {tab === "finalizadas" &&
            "Aún no hay prácticas finalizadas. Las que cierres aparecerán acá."}
          {tab === "eliminadas" &&
            "No hay prácticas eliminadas. Las que borres se archivan acá."}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
          {currentList.map((p) => (
            <PracticaCardEmp
              key={p.id}
              p={p}
              stages={stageCounts[p.id]}
              busy={processingId === p.id}
              onAskFinalize={onAskFinalize}
              onAskDelete={onAskDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
