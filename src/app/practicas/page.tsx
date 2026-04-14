"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import InternshipCard from "@/components/ui/InternshipCard";
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
  { value: "", label: "Todas" },
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 bg-gray-100 rounded-lg w-16" />
        ))}
      </div>
      <div className="h-px bg-gray-100 mb-4" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-16" />
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

  useEffect(() => {
    const fetchInternships = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (area) params.set("area", area);
        if (modality) params.set("modality", modality);
        params.set("page", String(page));
        const res = await fetch(`/api/internships?${params}`);
        const data = await res.json();
        setInternships(data.internships ?? []);
        setTotalPages(data.totalPages ?? 1);
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

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      {/* Navbar */}
      <header className="bg-[#f9f9ff]/80 backdrop-blur-xl border-b border-gray-100/60 sticky top-0 z-40 h-20">
        <div className="max-w-screen-2xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-black text-2xl tracking-tighter">
              <span className="text-brand-700">Practi</span>
              <span className="text-accent-500">X</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/practicas"
                className="text-sm font-bold text-brand-700 border-b-2 border-brand-700 pb-0.5"
              >
                Explorar prácticas
              </Link>
            </nav>
          </div>
          {session ? (
            <Link
              href="/dashboard"
              className="text-sm bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
            >
              Mi Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
            >
              Explorar →
            </Link>
          )}
        </div>
      </header>

      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-[#f9f9ff] via-[#f0f3ff] to-[#e7eefe] border-b border-gray-100 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-brand-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto px-8 py-10 relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gray-900 mb-3">
            Prácticas laborales
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            {session
              ? "Encontramos algunas prácticas recomendadas especiales para ti, de acuerdo con tu perfil."
              : "Explorá cientos de prácticas y encontrá la oportunidad perfecta para tu carrera."}
          </p>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-8 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 mb-8 flex flex-col md:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleFilter(setSearch)(e.target.value)}
              placeholder="Buscar prácticas, empresas, habilidades..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-brand-300 focus:bg-white transition-colors"
            />
          </div>

          <select
            value={area}
            onChange={(e) => handleFilter(setArea)(e.target.value)}
            className="text-sm border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:border-brand-300 focus:bg-white transition-colors text-gray-600"
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
            onChange={(e) => handleFilter(setModality)(e.target.value)}
            className="text-sm border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:border-brand-300 focus:bg-white transition-colors text-gray-600"
          >
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button className="flex items-center gap-2 text-sm border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 hover:bg-white transition-colors text-gray-500">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : internships.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-lg font-bold text-gray-500">
              No se encontraron prácticas
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Intentá ajustar los filtros
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {internships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  p === page
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                    : "bg-white border border-gray-100 text-gray-500 hover:border-brand-200 hover:text-brand-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
