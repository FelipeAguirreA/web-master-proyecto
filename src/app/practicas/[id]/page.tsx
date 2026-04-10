"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Building2,
} from "lucide-react";
import type { Internship } from "@/types";

type InternshipDetail = Internship & {
  company: { companyName: string; logo: string | null };
};

const MODALITY_LABELS: Record<string, { label: string; className: string }> = {
  REMOTE: { label: "Remoto", className: "bg-green-50 text-green-700" },
  ONSITE: { label: "Presencial", className: "bg-blue-50 text-blue-700" },
  HYBRID: { label: "Híbrido", className: "bg-purple-50 text-purple-700" },
};

function SkeletonDetail() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-8">
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-6" />
            <div className="flex gap-3 mb-6">
              <div className="h-5 bg-gray-100 rounded w-20" />
              <div className="h-5 bg-gray-100 rounded w-24" />
              <div className="h-5 bg-gray-100 rounded w-20" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 bg-gray-100 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 h-48" />
      </div>
    </div>
  );
}

export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetch(`/api/internships/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setInternship(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInternship();
  }, [id]);

  const handleApply = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
      return;
    }

    setApplying(true);
    setApplyError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId: id }),
      });

      if (res.ok) {
        setApplied(true);
      } else if (res.status === 409) {
        setApplyError("Ya te postulaste a esta práctica.");
        setApplied(true);
      } else {
        const data = await res.json();
        setApplyError(data.error ?? "Error al postularse. Intentá de nuevo.");
      }
    } catch {
      setApplyError("Error de red. Intentá de nuevo.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tight">
              <span className="text-brand-700">Practi</span>
              <span className="text-accent-500">X</span>
            </Link>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <SkeletonDetail />
        </div>
      </div>
    );
  }

  if (notFound || !internship) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Building2 className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Práctica no encontrada
        </h1>
        <p className="text-gray-500 mb-6">
          Esta práctica no existe o fue dada de baja.
        </p>
        <Link
          href="/practicas"
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Ver todas las prácticas
        </Link>
      </div>
    );
  }

  const modality = MODALITY_LABELS[internship.modality];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            <span className="text-brand-700">Practi</span>
            <span className="text-accent-500">X</span>
          </Link>
          {!session && (
            <Link
              href="/login"
              className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <Link
          href="/practicas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a prácticas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenido principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header de la práctica */}
            <div className="bg-white rounded-xl border border-gray-100 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {internship.title}
              </h1>
              <p className="text-brand-700 font-medium mb-6">
                {internship.company.companyName}
              </p>

              <div className="flex flex-wrap gap-3 mb-6 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {internship.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {internship.duration}
                </span>
                {modality && (
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${modality.className}`}
                  >
                    {modality.label}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                  {internship.area}
                </span>
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Descripción
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {internship.description}
              </p>
            </div>

            {/* Requisitos */}
            {internship.requirements.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Requisitos
                </h2>
                <ul className="space-y-2">
                  {internship.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <CheckCircle className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {internship.skills.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-8">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Habilidades requeridas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {internship.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">
              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
                  Empresa
                </p>
                <p className="font-semibold text-gray-900">
                  {internship.company.companyName}
                </p>
              </div>

              <div className="mb-6 space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400">Área</span>
                  <span className="font-medium">{internship.area}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Modalidad</span>
                  <span className="font-medium">{modality?.label ?? internship.modality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duración</span>
                  <span className="font-medium">{internship.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ubicación</span>
                  <span className="font-medium text-right">{internship.location}</span>
                </div>
              </div>

              {applyError && (
                <p className="text-xs text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">
                  {applyError}
                </p>
              )}

              {applied ? (
                <div className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 font-medium py-3 rounded-xl text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Postulación enviada
                </div>
              ) : !session ? (
                <button
                  onClick={handleApply}
                  className="w-full bg-brand-600 text-white font-medium py-3 rounded-xl hover:bg-brand-700 transition-colors text-sm"
                >
                  Iniciar sesión para postularse
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full bg-brand-600 text-white font-medium py-3 rounded-xl hover:bg-brand-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {applying ? "Enviando..." : "Postularme ahora"}
                </button>
              )}

              <p className="text-xs text-gray-400 text-center mt-3">
                Postulación gratuita · Sin intermediarios
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
