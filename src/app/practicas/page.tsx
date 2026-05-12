"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import {
  PracticaCard,
  type PracticaCardData,
} from "@/components/dashboard/sections/PracticaCard";
import { PracticaCardSkeleton } from "@/components/dashboard/sections/Skeletons";
import { D } from "@/components/dashboard/tokens";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";
import { Icon } from "@/components/dashboard/Icon";

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

type ApiInternship = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills?: string[];
  createdAt?: string;
  company: { companyName: string; logo: string | null };
};

type ApiResponse = {
  internships: ApiInternship[];
  total: number;
  page: number;
  totalPages: number;
};

type RecMap = Map<string, number>;

function toCard(it: ApiInternship, score: number | null): PracticaCardData {
  const co = it.company.companyName;
  const color = companyColor(co);
  const safeScore = score ?? 0;
  const top =
    safeScore >= 95
      ? "Top 5%"
      : safeScore >= 90
        ? "Top 10%"
        : safeScore >= 80
          ? "Top 20%"
          : null;
  const mode = `${MODALITY_LABEL[it.modality] ?? it.modality} · ${it.location}`;
  const isNew = it.createdAt
    ? Date.now() - new Date(it.createdAt).getTime() < 7 * 24 * 3600 * 1000
    : false;
  return {
    id: it.id,
    co,
    logo: companyInitials(co),
    logoUrl: it.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: it.title,
    description: it.description ?? null,
    mode,
    salary: null,
    dur: it.duration,
    score: safeScore,
    top,
    tags: (it.skills ?? []).slice(0, 4),
    deadline: null,
    applicants: null,
    isNew,
    ai: null,
  };
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

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

  const cards = useMemo(() => {
    const base = internships.map((it) =>
      toCard(it, recs.has(it.id) ? Math.round(recs.get(it.id) ?? 0) : null),
    );
    if (sort === "match") {
      return [...base].sort((a, b) => b.score - a.score);
    }
    return base;
  }, [internships, recs, sort]);

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
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: D.bg,
        color: D.text,
        fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
        overflowX: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-10%",
            width: "60%",
            height: "50%",
            borderRadius: "50%",
            opacity: 0.5,
            background:
              "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-5%",
            right: "-15%",
            width: "55%",
            height: "50%",
            borderRadius: "50%",
            opacity: 0.45,
            background:
              "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />

      <main
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: 96,
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
          }}
          className="practix-list-container"
        >
          {/* Hero */}
          <section
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.7rem,2.8vw,2.2rem)",
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: D.text,
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                Prácticas {session ? "para ti" : "disponibles"}
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: D.muted,
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {session && recs.size > 0 ? (
                  <>
                    Ordenadas por{" "}
                    <b style={{ color: D.text }}>match con tu CV</b>. Los
                    filtros refinan la búsqueda.
                  </>
                ) : session ? (
                  <>
                    Subí tu CV en{" "}
                    <a
                      href="/perfil"
                      style={{ color: D.accent, fontWeight: 700 }}
                    >
                      tu perfil
                    </a>{" "}
                    para ver el match con cada práctica.
                  </>
                ) : (
                  <>
                    Explorá todas las prácticas activas en Chile.{" "}
                    <a
                      href="/login?role=student"
                      style={{ color: D.accent, fontWeight: 700 }}
                    >
                      Iniciá sesión
                    </a>{" "}
                    para ver tu match personalizado.
                  </>
                )}
              </p>
            </div>
          </section>

          {/* Top filters */}
          <div
            style={{
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 14,
            }}
          >
            <div
              className="practix-list-filters-row"
              style={{
                display: "flex",
                gap: 10,
                marginBottom: activeChips.length > 0 ? 12 : 0,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: D.subtle,
                    display: "flex",
                    pointerEvents: "none",
                  }}
                >
                  <Icon name="search" size={14} color={D.subtle} />
                </span>
                <input
                  type="text"
                  placeholder="Buscá por título o descripción…"
                  value={search}
                  onChange={(e) => setFilter(setSearch)(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 34px",
                    background: "rgba(0,0,0,.04)",
                    border: "1.5px solid transparent",
                    borderRadius: 9,
                    fontSize: 12.5,
                    color: D.text,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "all .15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.background = D.surface;
                    e.currentTarget.style.borderColor = D.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${D.accent}1c`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,.04)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <select
                value={area}
                onChange={(e) => setFilter(setArea)(e.target.value)}
                className="practix-list-select"
                style={{
                  padding: "8px 28px 8px 12px",
                  background: "rgba(0,0,0,.04)",
                  border: "1.5px solid transparent",
                  borderRadius: 9,
                  fontSize: 12.5,
                  color: area ? D.text : D.muted,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  appearance: "none",
                  outline: "none",
                  minWidth: 140,
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%236D6A63' d='M0 0h10L5 6z'/></svg>")`,
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

              <select
                value={modality}
                onChange={(e) => setFilter(setModality)(e.target.value)}
                className="practix-list-select"
                style={{
                  padding: "8px 28px 8px 12px",
                  background: "rgba(0,0,0,.04)",
                  border: "1.5px solid transparent",
                  borderRadius: 9,
                  fontSize: 12.5,
                  color: modality ? D.text : D.muted,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  appearance: "none",
                  outline: "none",
                  minWidth: 140,
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%236D6A63' d='M0 0h10L5 6z'/></svg>")`,
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

            {activeChips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: D.subtle,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                  }}
                >
                  Activos:
                </span>
                {activeChips.map((chip) => (
                  <span
                    key={chip.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: D.surface,
                      border: `1px solid ${D.border}`,
                      padding: "5px 10px 5px 11px",
                      borderRadius: 30,
                      fontSize: 11.5,
                      color: D.text,
                      fontWeight: 600,
                    }}
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onClear}
                      style={{
                        background: "rgba(0,0,0,.06)",
                        border: "none",
                        cursor: "pointer",
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        color: D.muted,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        lineHeight: 1,
                      }}
                      aria-label={`Quitar ${chip.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    fontSize: 11.5,
                    color: D.accent,
                    fontWeight: 700,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "5px 8px",
                    fontFamily: "inherit",
                  }}
                >
                  Limpiar todo
                </button>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              padding: "10px 14px",
              background: D.surface,
              border: `1px solid ${D.border}`,
              borderRadius: 12,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: D.muted,
                fontWeight: 600,
              }}
            >
              <b style={{ color: D.text }}>{total}</b>{" "}
              {total === 1 ? "resultado" : "resultados"}
              {recs.size > 0 && session && (
                <>
                  {" "}
                  ·{" "}
                  <span style={{ color: D.accent, fontWeight: 700 }}>
                    {recs.size} con match calculado
                  </span>
                </>
              )}
            </p>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: D.muted,
                fontWeight: 600,
              }}
            >
              Ordenar
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={{
                  padding: "6px 26px 6px 10px",
                  background: "rgba(0,0,0,.04)",
                  border: "1.5px solid transparent",
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: D.text,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  appearance: "none",
                  outline: "none",
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%236D6A63' d='M0 0h10L5 6z'/></svg>")`,
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
            <p
              style={{
                fontSize: 11.5,
                color: D.subtle,
                marginTop: -6,
                marginBottom: 10,
                padding: "0 4px",
                lineHeight: 1.5,
              }}
            >
              El orden por match aplica solo a las prácticas de esta página.
              Para ver todas tus mejores matches, andá al{" "}
              <a
                href="/dashboard/estudiante"
                style={{ color: D.accent, fontWeight: 700 }}
              >
                dashboard
              </a>
              .
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div
              className="practix-list-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {Array.from({ length: pageSize > 8 ? 8 : pageSize }, (_, i) => (
                <PracticaCardSkeleton key={i} />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div
              style={{
                background: D.surface,
                border: `1px dashed ${D.border}`,
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                color: D.muted,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              <p
                style={{
                  color: D.text,
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Sin resultados
              </p>
              {activeChips.length > 0 ? (
                <>
                  Probá quitar algún filtro o{" "}
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      color: D.accent,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "inherit",
                      fontFamily: "inherit",
                    }}
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
            <div
              className="practix-list-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {cards.map((p) => (
                <PracticaCard key={p.id} p={p} />
              ))}
            </div>
          )}

          {/* Paginator */}
          {!loading && total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 22,
                padding: "14px 18px",
                background: D.surface,
                border: `1px solid ${D.border}`,
                borderRadius: 12,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <p
                style={{
                  fontSize: 12.5,
                  color: D.muted,
                  fontWeight: 600,
                }}
              >
                Mostrando{" "}
                <b style={{ color: D.text }}>
                  {from}–{to}
                </b>{" "}
                de <b style={{ color: D.text }}>{total}</b>
              </p>
              <nav style={{ display: "inline-flex", gap: 4 }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    minWidth: 36,
                    height: 36,
                    padding: "0 10px",
                    background: "rgba(0,0,0,.04)",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 700,
                    color: page <= 1 ? D.faint : D.muted,
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    opacity: page <= 1 ? 0.5 : 1,
                  }}
                  aria-label="Página anterior"
                >
                  ←
                </button>
                {pageList.map((n, i) => {
                  const active = n === page;
                  if (n === "…") {
                    return (
                      <span
                        key={`ell-${i}`}
                        style={{
                          minWidth: 36,
                          height: 36,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          color: D.subtle,
                        }}
                      >
                        …
                      </span>
                    );
                  }
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      style={{
                        minWidth: 36,
                        height: 36,
                        padding: "0 12px",
                        background: active ? D.text : "transparent",
                        border: "none",
                        borderRadius: 9,
                        fontSize: 13,
                        fontWeight: active ? 800 : 600,
                        color: active ? "#fff" : D.text,
                        cursor: "pointer",
                        transition: "all .15s",
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    minWidth: 36,
                    height: 36,
                    padding: "0 10px",
                    background:
                      page >= totalPages
                        ? "rgba(0,0,0,.04)"
                        : `linear-gradient(135deg,${D.accent},${D.accentHi})`,
                    color: page >= totalPages ? D.faint : "#fff",
                    border: "none",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: page >= totalPages ? "not-allowed" : "pointer",
                    boxShadow:
                      page >= totalPages ? "none" : `0 4px 12px ${D.accent}44`,
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                  aria-label="Página siguiente"
                >
                  →
                </button>
              </nav>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  color: D.muted,
                  fontWeight: 600,
                }}
              >
                Por página
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: "5px 9px",
                    background: "rgba(0,0,0,.04)",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 12,
                    color: D.text,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
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
      </main>

      <style>{`
        @media (max-width:900px) {
          .practix-list-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width:600px) {
          .practix-list-container { padding: 0 16px !important; }
          .practix-list-filters-row > * { width: 100%; min-width: 0 !important; }
        }
      `}</style>
    </div>
  );
}
