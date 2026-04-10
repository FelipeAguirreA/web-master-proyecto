"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
      <div className="h-3 bg-gray-100 rounded w-5/6 mb-4" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-gray-100 rounded w-16" />
        ))}
      </div>
      <div className="flex gap-4">
        <div className="h-3 bg-gray-100 rounded w-20" />
        <div className="h-3 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

export default function PracticasPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </Link>
          <Link
            href="/login"
            className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Prácticas laborales
        </h1>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-8 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleFilter(setSearch)(e.target.value)}
              placeholder="Buscar prácticas..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
            />
          </div>

          <select
            value={area}
            onChange={(e) => handleFilter(setArea)(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-400 text-gray-700"
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
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-400 text-gray-700"
          >
            {MODALITIES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : internships.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <SlidersHorizontal className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">
              No se encontraron prácticas
            </p>
            <p className="text-sm mt-1">Intentá ajustar los filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-brand-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
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
