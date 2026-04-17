"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, Sparkles, SlidersHorizontal } from "lucide-react";
import InternshipCard from "@/components/ui/InternshipCard";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { Internship } from "@/types";

type InternshipWithCompany = Internship & {
  company: { companyName: string; logo: string | null };
};

const AREAS = [
  "Ingeniería",
  "Marketing",
  "Diseño",
  "Datos",
  "Finanzas",
  "RRHH",
  "Legal",
];

const MODALITIES = [
  { value: "", label: "Todas las modalidades" },
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[20px] border border-black/[0.06] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 bg-[#F4F3EF] rounded-xl" />
        <div className="flex-1 pt-1">
          <div className="h-3.5 bg-[#F4F3EF] rounded w-3/4 mb-2" />
          <div className="h-2.5 bg-[#F4F3EF]/60 rounded w-1/2" />
        </div>
      </div>
      <div className="h-2.5 bg-[#F4F3EF]/70 rounded w-full mb-2" />
      <div className="h-2.5 bg-[#F4F3EF]/70 rounded w-5/6 mb-4" />
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-[#F4F3EF] rounded-lg w-14" />
        ))}
      </div>
      <div className="h-px bg-[#F4F3EF] mb-3" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F4F3EF] rounded w-20" />
        <div className="h-2.5 bg-[#F4F3EF] rounded w-16" />
      </div>
    </div>
  );
}

export default function PracticasPage() {
  const { data: session } = useSession();
  const [internships, setInternships] = useState<InternshipWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [modality, setModality] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchInternships = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (area) params.set("area", area);
        if (modality) params.set("modality", modality);
        params.set("page", String(page));
        params.set("limit", "9");
        const res = await fetch(`/api/internships?${params}`);
        const data = await res.json();
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
  }, [search, area, modality, page]);

  const handleFilter = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setArea("");
    setModality("");
    setPage(1);
  };

  const hasFilters = search || area || modality;

  return (
    <div
      className="relative min-h-screen bg-[#FAFAF8] text-[#0A0909] antialiased overflow-x-hidden"
      style={{ fontFamily: "var(--font-onest), ui-sans-serif, system-ui" }}
    >
      {/* ========== AMBIENT GRADIENT MESH ========== */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-[-5%] right-[-15%] w-[55%] h-[50%] rounded-full opacity-45"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* ========== NAV ========== */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-[1240px] mx-auto px-6 pt-4">
          <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl border border-black/[0.05] px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.06)]">
            <Link href="/" className="flex items-center gap-2">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]">
                <span className="text-white font-bold text-[15px] leading-none tracking-tight">
                  P
                </span>
              </span>
              <span className="text-[17px] font-semibold tracking-[-0.015em] text-[#0A0909]">
                PractiX
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 bg-black/[0.03] rounded-xl p-1">
              <Link
                href="/practicas"
                className="text-[13px] font-semibold text-[#0A0909] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] px-3.5 py-1.5 rounded-lg"
              >
                Prácticas
              </Link>
              <Link
                href="/#producto"
                className="text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] hover:bg-white/80 transition-all px-3.5 py-1.5 rounded-lg"
              >
                Producto
              </Link>
              <Link
                href="/#empresas"
                className="text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] hover:bg-white/80 transition-all px-3.5 py-1.5 rounded-lg"
              >
                Para empresas
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {session ? (
                <>
                  {session.user.email === ADMIN_EMAIL && (
                    <Link
                      href="/admin/empresas"
                      className="hidden sm:inline-flex text-[12px] font-medium text-[#FF6A3D] bg-[#FF6A3D]/10 hover:bg-[#FF6A3D]/15 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#0A0909] text-white px-4 py-2 rounded-lg hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    Ir al panel
                    <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[13px] font-medium text-[#4A4843] hover:text-[#0A0909] px-3 py-1.5 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#0A0909] text-white px-4 py-2 rounded-lg hover:bg-[#1D1B18] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    Empezar gratis
                    <span className="text-[11px] transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-[112px] pb-24">
        {/* ========== HERO ========== */}
        <section className="relative pb-10">
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="flex flex-col items-start gap-5 max-w-[720px]">
              <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md border border-black/[0.06] rounded-full pl-1.5 pr-3.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <span className="flex items-center gap-1.5 bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full">
                  LIVE
                </span>
                <span className="text-[12px] font-medium text-[#4A4843]">
                  {total > 0
                    ? `${total} prácticas activas`
                    : "Actualizado en tiempo real"}
                </span>
              </span>

              <h1 className="text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.04] tracking-[-0.03em] font-semibold text-[#0A0909]">
                {session ? (
                  <>
                    Tu próxima práctica,
                    <br />
                    <span className="relative inline-block">
                      <span className="relative z-10 bg-gradient-to-br from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
                        seleccionada para vos
                      </span>
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Prácticas que{" "}
                    <span className="relative inline-block">
                      <span className="relative z-10 bg-gradient-to-br from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
                        encajan
                      </span>
                    </span>
                    <br />
                    con lo que sabés hacer.
                  </>
                )}
              </h1>

              <p className="text-[16px] leading-[1.55] text-[#4A4843] max-w-[520px]">
                {session
                  ? "Ordenadas por afinidad con tu perfil. Postulate directo, sin formularios largos ni filtros arbitrarios."
                  : "Explorá todas las oportunidades activas de la plataforma. Filtrá por área, modalidad o habilidad — y postulate en un click."}
              </p>
            </div>
          </div>
        </section>

        {/* ========== FILTERS ========== */}
        <section className="relative mb-8">
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] p-2.5 flex flex-col lg:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9891]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleFilter(setSearch)(e.target.value)}
                  placeholder="Buscar por rol, empresa o habilidad…"
                  className="w-full pl-11 pr-4 py-3 text-[14px] rounded-xl bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]"
                />
              </div>

              {/* Area */}
              <div className="relative">
                <select
                  value={area}
                  onChange={(e) => handleFilter(setArea)(e.target.value)}
                  className="appearance-none cursor-pointer pl-4 pr-10 py-3 text-[13.5px] font-medium rounded-xl bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white transition-all text-[#0A0909] min-w-[170px]"
                >
                  <option value="">Todas las áreas</option>
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6D6A63] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Modality */}
              <div className="relative">
                <select
                  value={modality}
                  onChange={(e) => handleFilter(setModality)(e.target.value)}
                  className="appearance-none cursor-pointer pl-4 pr-10 py-3 text-[13.5px] font-medium rounded-xl bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white transition-all text-[#0A0909] min-w-[190px]"
                >
                  {MODALITIES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6D6A63] pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#FF6A3D] hover:text-[#E85A2D] px-4 py-3 rounded-xl hover:bg-[#FFF3EC] transition-colors"
                >
                  Limpiar
                  <span className="text-[11px]">×</span>
                </button>
              )}
            </div>

            {/* Active filters row */}
            {hasFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap pl-1">
                <span className="text-[11.5px] font-semibold tracking-wide uppercase text-[#9B9891]">
                  Filtros activos
                </span>
                {search && (
                  <button
                    onClick={() => handleFilter(setSearch)("")}
                    className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-full pl-3 pr-2 py-1 text-[12px] font-medium text-[#4A4843] hover:border-[#FF6A3D]/30 transition-colors"
                  >
                    &ldquo;{search}&rdquo;
                    <span className="text-[#9B9891]">×</span>
                  </button>
                )}
                {area && (
                  <button
                    onClick={() => handleFilter(setArea)("")}
                    className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-full pl-3 pr-2 py-1 text-[12px] font-medium text-[#4A4843] hover:border-[#FF6A3D]/30 transition-colors"
                  >
                    {area}
                    <span className="text-[#9B9891]">×</span>
                  </button>
                )}
                {modality && (
                  <button
                    onClick={() => handleFilter(setModality)("")}
                    className="inline-flex items-center gap-1.5 bg-white border border-black/[0.06] rounded-full pl-3 pr-2 py-1 text-[12px] font-medium text-[#4A4843] hover:border-[#FF6A3D]/30 transition-colors"
                  >
                    {MODALITIES.find((m) => m.value === modality)?.label}
                    <span className="text-[#9B9891]">×</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ========== RESULTS ========== */}
        <section className="relative">
          <div className="max-w-[1240px] mx-auto px-6">
            {/* Results count */}
            {!loading && internships.length > 0 && (
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[13px] text-[#6D6A63]">
                  Mostrando{" "}
                  <span className="font-semibold text-[#0A0909]">
                    {internships.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-[#0A0909]">{total}</span>{" "}
                  prácticas
                </p>
                <div className="flex items-center gap-1.5 bg-[#F4F3EF] rounded-lg px-2.5 py-1 text-[11px] text-[#6D6A63]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
                  Actualizado ahora
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : internships.length === 0 ? (
              <div className="relative bg-white rounded-[24px] border border-black/[0.06] p-14 text-center overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div
                  aria-hidden
                  className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FFE4D2]/50 to-transparent rounded-full blur-3xl"
                />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF3EC] to-[#FFE4D2] border border-[#FF6A3D]/10 mb-5">
                    <Sparkles className="w-6 h-6 text-[#FF6A3D]" />
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-[#0A0909] mb-2">
                    Nada que coincida todavía
                  </h3>
                  <p className="text-[14px] text-[#6D6A63] max-w-[360px] mx-auto leading-[1.55] mb-6">
                    Probá ajustar los filtros o ampliar el área de búsqueda. Las
                    empresas publican prácticas nuevas todos los días.
                  </p>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 bg-[#0A0909] text-white text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-[#1D1B18] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                    >
                      Limpiar filtros
                      <span className="text-[11px]">→</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {internships.map((internship) => (
                  <InternshipCard key={internship.id} internship={internship} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-center gap-1.5 mt-12">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 rounded-xl text-[13px] font-medium bg-white border border-black/[0.06] text-[#4A4843] hover:border-[#0A0909] hover:text-[#0A0909] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-black/[0.06] disabled:hover:text-[#4A4843]"
                  aria-label="Página anterior"
                >
                  ←
                </button>
                {buildPageList(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`dots-${i}`}
                      className="w-8 h-10 flex items-center justify-center text-[13px] text-[#9B9891]"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-[13px] font-semibold transition-all ${
                        p === page
                          ? "bg-[#0A0909] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]"
                          : "bg-white border border-black/[0.06] text-[#4A4843] hover:border-[#0A0909] hover:text-[#0A0909]"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-xl text-[13px] font-medium bg-white border border-black/[0.06] text-[#4A4843] hover:border-[#0A0909] hover:text-[#0A0909] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-black/[0.06] disabled:hover:text-[#4A4843]"
                  aria-label="Página siguiente"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="relative z-10 border-t border-black/[0.06] bg-white/40 backdrop-blur-sm">
        <div className="max-w-[1240px] mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] shadow-[0_2px_6px_-1px_rgba(255,106,61,0.45)]">
                <span className="text-white font-bold text-[11px] leading-none tracking-tight">
                  P
                </span>
              </span>
              <p className="text-[12.5px] text-[#6D6A63]">
                © {new Date().getFullYear()} PractiX · Hecho en Buenos Aires
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[#6D6A63]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28C840] animate-pulse" />
              Todos los sistemas operativos
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
