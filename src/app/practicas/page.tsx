"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PublicOrDashboardShell } from "@/components/dashboard/PublicOrDashboardShell";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { PracticaCard } from "@/components/dashboard/sections/PracticaCard";
import { PracticaCardSkeleton } from "@/components/dashboard/sections/Skeletons";
import { Icon } from "@/components/dashboard/Icon";
import { toCard, buildPageList, type ApiInternship } from "./utils";

const AREAS = [
  "Ingeniería",
  "Marketing",
  "Diseño",
  "Datos",
  "Finanzas",
  "RRHH",
  "Legal",
];

const MODALITIES: Array<{ value: string; label: string }> = [
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

const PAGE_SIZE_OPTIONS = [16, 32, 64] as const;

type SortKey = "newest" | "match";

type ApiResponse = {
  internships: ApiInternship[];
  total: number;
  page: number;
  totalPages: number;
};

type RecMap = Map<string, number>;

// SVG inline del chevron para los selects — valor dinámico que no tiene token
const SELECT_CHEVRON = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%236D6A63' d='M0 0h10L5 6z'/></svg>")`;

export default function PracticasPage() {
  const { data: session } = useSession();
  const [internships, setInternships] = useState<ApiInternship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [modality, setModality] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(16);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [recs, setRecs] = useState<RecMap>(new Map());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    const fetchInternships = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (area) params.set("area", area);
        if (modality) params.set("modality", modality);
        params.set("page", String(page));
        params.set("limit", String(pageSize));
        const res = await fetchWithRefresh(`/api/internships?${params}`, {
          cache: "no-store",
        });
        const data: ApiResponse = await res.json();
        setInternships(data.internships ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      } catch {
        setInternships([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInternships();
  }, [search, area, modality, page, pageSize]);

  // Carga match scores solo si hay sesión (estudiante)
  useEffect(() => {
    if (!session) {
      setRecs(new Map());
      return;
    }
    fetchWithRefresh("/api/matching/recommendations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; matchScore?: number | null }>) => {
        const map = new Map<string, number>();
        for (const r of data ?? []) {
          if (typeof r.matchScore === "number") map.set(r.id, r.matchScore);
        }
        setRecs(map);
      })
      .catch(() => setRecs(new Map()));
  }, [session]);

  // Carga prácticas ya postuladas por el estudiante. Necesario para distinguir
  // entre "match 0%" y "ya postulaste" — las postuladas las excluye getRecommendations
  // pero igual aparecen en /practicas, y sin esta info quedaban con score 0%.
  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") {
      setAppliedIds(new Set());
      return;
    }
    fetchWithRefresh("/api/applications/my", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((apps: Array<{ internship?: { id: string } | null }>) => {
        const ids = new Set<string>();
        for (const a of apps ?? []) {
          if (a.internship?.id) ids.add(a.internship.id);
        }
        setAppliedIds(ids);
      })
      .catch(() => setAppliedIds(new Set()));
  }, [session]);

  const cards = useMemo(() => {
    const base = internships.map((it) =>
      toCard(
        it,
        recs.has(it.id) ? Math.round(recs.get(it.id) ?? 0) : null,
        appliedIds.has(it.id),
      ),
    );
    if (sort === "match") {
      return [...base].sort((a, b) => b.score - a.score);
    }
    return base;
  }, [internships, recs, appliedIds, sort]);

  const setFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setArea("");
    setModality("");
    setPage(1);
  };

  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (area)
    activeChips.push({ label: area, onClear: () => setFilter(setArea)("") });
  if (modality)
    activeChips.push({
      label: MODALITY_LABEL[modality] ?? modality,
      onClear: () => setFilter(setModality)(""),
    });
  if (search)
    activeChips.push({
      label: `"${search}"`,
      onClear: () => setFilter(setSearch)(""),
    });

  const pageList = buildPageList(page, totalPages);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <PublicOrDashboardShell
      publicBackdrop={
        <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute rounded-full opacity-50"
            style={{
              top: "-15%",
              left: "-10%",
              width: "60%",
              height: "50%",
              background:
                "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: "-5%",
              right: "-15%",
              width: "55%",
              height: "50%",
              opacity: 0.45,
              background:
                "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
              filter: "blur(50px)",
            }}
          />
        </div>
      }
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8">
        {/* CTA para no logueados */}
        {!session && (
          <section className="relative overflow-hidden flex items-center justify-between gap-[18px] flex-wrap bg-dark rounded-[18px] px-6 py-5 mb-5 text-white">
            {/* Glow decorativo — gradiente radial con accent como variable dinámica */}
            <div
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                top: -60,
                right: -40,
                width: 220,
                height: 220,
                background:
                  "radial-gradient(circle, rgba(255,106,61,0.33), transparent 65%)",
              }}
            />
            <div className="relative flex-1 min-w-[240px]">
              <p className="text-[10.5px] font-extrabold text-accent tracking-[1px] uppercase mb-1.5">
                Match con IA
              </p>
              <h2 className="text-[clamp(1.05rem,1.8vw,1.3rem)] font-extrabold tracking-[-0.4px] leading-[1.25] mb-1">
                Encuentra las prácticas que mejor te calzan
              </h2>
              <p className="text-[12.5px] text-white/70 leading-[1.55] max-w-[520px]">
                Inicia sesión o crea tu cuenta. Sube tu CV y declaras tus
                skills, y te mostramos cada práctica con un % de match real.
              </p>
            </div>
            <div className="relative flex gap-2.5 flex-wrap">
              <a
                href="/login?role=student"
                className="bg-gradient-to-br from-accent to-accent-hi text-white px-[18px] py-2.5 rounded-[11px] text-[13px] font-bold no-underline shadow-[0_6px_16px_rgba(255,106,61,0.33)]"
              >
                Iniciar sesión
              </a>
              <a
                href="/registro"
                className="bg-white/10 text-white px-[18px] py-2.5 rounded-[11px] text-[13px] font-bold border border-white/[0.18] no-underline"
              >
                Crear cuenta
              </a>
            </div>
          </section>
        )}

        {/* Hero */}
        <section className="flex items-end justify-between gap-5 mb-6 flex-wrap">
          <div>
            <h1 className="text-[clamp(1.7rem,2.8vw,2.2rem)] font-extrabold tracking-[-1px] text-text leading-[1.1] mb-2">
              Prácticas {session ? "para ti" : "disponibles"}
            </h1>
            <p className="text-[14px] text-muted leading-[1.55] max-w-[560px]">
              {session && recs.size > 0 ? (
                <>
                  Ordenadas por <b className="text-text">match con tu CV</b>.
                  Los filtros refinan la búsqueda.
                </>
              ) : session ? (
                <>
                  Sube tu CV en{" "}
                  <a href="/perfil" className="text-accent font-bold">
                    tu perfil
                  </a>{" "}
                  para ver el match con cada práctica.
                </>
              ) : (
                <>
                  Explora todas las prácticas activas en Chile.{" "}
                  <a
                    href="/login?role=student"
                    className="text-accent font-bold"
                  >
                    Inicia sesión
                  </a>{" "}
                  para ver tu match personalizado.
                </>
              )}
            </p>
          </div>
        </section>

        {/* Filter bar */}
        <div className="bg-surface border border-border rounded-[14px] px-4 py-3.5 mb-3.5">
          {/* Fila de filtros: vertical en mobile, horizontal en md+ */}
          <div
            className={[
              "flex flex-col md:flex-row gap-2.5 md:items-center",
              activeChips.length > 0 ? "mb-3" : "",
            ].join(" ")}
          >
            {/* Search input */}
            <div className="relative flex-1 min-w-0 md:min-w-[220px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex pointer-events-none text-subtle">
                <Icon name="search" size={14} color="currentColor" />
              </span>
              <input
                id="practicas-search"
                name="practicas-search"
                type="search"
                role="searchbox"
                aria-label="Buscar prácticas por título o descripción"
                autoComplete="off"
                placeholder="Buscá por título o descripción…"
                value={search}
                onChange={(e) => setFilter(setSearch)(e.target.value)}
                className="w-full py-[9px] pl-[34px] pr-3 bg-black/[0.04] border-[1.5px] border-transparent rounded-[9px] text-[12.5px] text-text font-semibold font-inherit outline-none transition-all duration-150 focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,106,61,0.11)]"
              />
            </div>

            {/* Select área */}
            <select
              id="practicas-area"
              name="practicas-area"
              aria-label="Filtrar por área"
              value={area}
              onChange={(e) => setFilter(setArea)(e.target.value)}
              className="w-full md:w-auto md:min-w-[170px] py-2 pl-3 pr-7 bg-black/[0.04] border-[1.5px] border-transparent rounded-[9px] text-[12.5px] font-semibold font-inherit cursor-pointer appearance-none text-muted"
              style={{
                color: area ? "var(--color-text)" : undefined,
                backgroundImage: SELECT_CHEVRON,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="">Todas las áreas</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Select modalidad */}
            <select
              id="practicas-modality"
              name="practicas-modality"
              aria-label="Filtrar por modalidad"
              value={modality}
              onChange={(e) => setFilter(setModality)(e.target.value)}
              className="w-full md:w-auto md:min-w-[170px] py-2 pl-3 pr-7 bg-black/[0.04] border-[1.5px] border-transparent rounded-[9px] text-[12.5px] font-semibold font-inherit cursor-pointer appearance-none text-muted"
              style={{
                color: modality ? "var(--color-text)" : undefined,
                backgroundImage: SELECT_CHEVRON,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="">Todas las modalidades</option>
              {MODALITIES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="flex gap-[7px] flex-wrap items-center">
              <span className="text-[11.5px] font-bold text-subtle tracking-[0.3px] uppercase">
                Activos:
              </span>
              {activeChips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 bg-surface border border-border py-[5px] pl-[11px] pr-2.5 rounded-full text-[11.5px] text-text font-semibold"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onClear}
                    className="w-[15px] h-[15px] rounded-full bg-black/[0.06] border-none cursor-pointer text-muted text-[11px] flex items-center justify-center p-0 leading-none"
                    aria-label={`Quitar ${chip.label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11.5px] text-accent font-bold bg-transparent border-none cursor-pointer px-2 py-[5px] font-inherit"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>

        {/* Toolbar: resultados + ordenar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-3.5 py-2.5 bg-surface border border-border rounded-[12px]">
          <p className="text-[13px] text-muted font-semibold">
            <b className="text-text">{total}</b>{" "}
            {total === 1 ? "resultado" : "resultados"}
            {recs.size > 0 && session && (
              <>
                {" "}
                ·{" "}
                <span className="text-accent font-bold">
                  {recs.size} con match calculado
                </span>
              </>
            )}
          </p>
          <label className="inline-flex items-center gap-2 text-[12px] text-muted font-semibold">
            Ordenar
            <select
              id="practicas-sort"
              name="practicas-sort"
              aria-label="Ordenar resultados"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="py-1.5 pl-2.5 pr-[26px] bg-black/[0.04] border-[1.5px] border-transparent rounded-[8px] text-[12.5px] text-text font-bold font-inherit cursor-pointer appearance-none"
              style={{
                backgroundImage: SELECT_CHEVRON,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="newest">Más nuevas primero</option>
              {session && recs.size > 0 && (
                <option value="match">Mejor match (CV)</option>
              )}
            </select>
          </label>
        </div>

        {sort === "match" && (
          <p className="text-[11.5px] text-subtle -mt-1.5 mb-2.5 px-1 leading-[1.5]">
            El orden por match aplica solo a las prácticas de esta página. Para
            ver todas tus mejores matches, andá al{" "}
            <a href="/dashboard/estudiante" className="text-accent font-bold">
              dashboard
            </a>
            .
          </p>
        )}

        {/* Grid de cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Array.from({ length: pageSize > 8 ? 8 : pageSize }, (_, i) => (
              <PracticaCardSkeleton key={i} />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-[16px] p-10 text-center text-muted text-[13.5px] leading-[1.6]">
            <p className="text-text font-bold text-[14px] mb-1.5">
              Sin resultados
            </p>
            {activeChips.length > 0 ? (
              <>
                Probá quitar algún filtro o{" "}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-accent font-bold bg-transparent border-none cursor-pointer p-0 text-[inherit] font-inherit"
                >
                  limpiar todo
                </button>
                .
              </>
            ) : (
              "No hay prácticas activas por ahora. Volvé a chequear pronto."
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {cards.map((p) => (
              <PracticaCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {/* Paginador */}
        {!loading && total > 0 && (
          <div className="flex flex-wrap justify-between items-center gap-3 mt-[22px] px-[18px] py-3.5 bg-surface border border-border rounded-[12px]">
            <p className="text-[12.5px] text-muted font-semibold">
              Mostrando{" "}
              <b className="text-text">
                {from}–{to}
              </b>{" "}
              de <b className="text-text">{total}</b>
            </p>

            <nav className="flex flex-wrap items-center gap-1 justify-center">
              {/* Anterior */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-w-[40px] h-10 px-2.5 bg-black/[0.04] border-none rounded-[9px] text-[13px] font-bold text-muted cursor-pointer disabled:text-faint disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Página anterior"
              >
                ←
              </button>

              {pageList.map((n, i) => {
                if (n === "…") {
                  return (
                    <span
                      key={`ell-${i}`}
                      className="min-w-[40px] h-10 inline-flex items-center justify-center text-[13px] text-subtle"
                    >
                      …
                    </span>
                  );
                }
                const active = n === page;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={[
                      "min-w-[40px] h-10 px-3 border-none rounded-[9px] text-[13px] cursor-pointer transition-all duration-150",
                      active
                        ? "bg-text text-white font-extrabold"
                        : "bg-transparent text-text font-semibold",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                );
              })}

              {/* Siguiente */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={[
                  "min-w-[40px] h-10 px-2.5 border-none rounded-[9px] text-[13px] font-bold cursor-pointer transition-all duration-150",
                  page >= totalPages
                    ? "bg-black/[0.04] text-faint opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-br from-accent to-accent-hi text-white shadow-[0_4px_12px_rgba(255,106,61,0.27)]",
                ].join(" ")}
                aria-label="Página siguiente"
              >
                →
              </button>
            </nav>

            <label className="inline-flex items-center gap-[7px] text-[12px] text-muted font-semibold">
              Por página
              <select
                id="practicas-page-size"
                name="practicas-page-size"
                aria-label="Resultados por página"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="py-[5px] px-[9px] bg-black/[0.04] border-none rounded-[7px] text-[12px] text-text font-bold font-inherit cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </PublicOrDashboardShell>
  );
}
