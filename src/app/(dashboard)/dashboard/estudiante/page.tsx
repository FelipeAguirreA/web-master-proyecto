"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Upload,
  Sparkles,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import InternshipCard from "@/components/ui/InternshipCard";
import type { Internship, Application } from "@/types";

type InternshipWithCompany = Internship & {
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
};

type ApplicationWithInternship = Application & {
  internship: {
    title: string;
    company: { companyName: string };
  };
};

type UserWithProfile = {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    cvUrl?: string | null;
  } | null;
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    color: "text-amber-600 bg-amber-50",
  },
  REVIEWED: {
    label: "En revisión",
    icon: FileText,
    color: "text-blue-600 bg-blue-50",
  },
  ACCEPTED: {
    label: "Aceptada",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    color: "text-red-600 bg-red-50",
  },
};

type Tab = "recommendations" | "applications";

export default function StudentDashboard() {
  const { data: session } = useSession();

  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [recommendations, setRecommendations] = useState<
    InternshipWithCompany[]
  >([]);
  const [applications, setApplications] = useState<ApplicationWithInternship[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [tab, setTab] = useState<Tab>("recommendations");

  const loadRecommendations = async () => {
    try {
      const res = await fetch("/api/matching/recommendations");
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data ?? []);
      }
    } catch {
      setRecommendations([]);
    }
  };

  const loadUser = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (!session) return;

    loadUser();

    fetch("/api/applications/my")
      .then((r) => r.json())
      .then((data) => setApplications(data ?? []))
      .catch(() => setApplications([]));

    loadRecommendations();
  }, [session]);

  const handleCVUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("cv", file);

      const res = await fetch("/api/matching/upload-cv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(
          data.error ?? "Error al procesar el CV. Intentá de nuevo.",
        );
        return;
      }

      await Promise.all([loadUser(), loadRecommendations()]);
    } catch {
      setUploadError("Error de red. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCVDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/matching/upload-cv", { method: "DELETE" });
      if (res.ok) {
        await Promise.all([loadUser(), loadRecommendations()]);
      }
    } catch {
      // silencioso
    } finally {
      setDeleting(false);
    }
  };

  const hasCv = !!user?.studentProfile?.cvUrl;
  const name = session?.user?.name?.split(" ")[0] ?? "estudiante";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {name} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">
          Encuentra prácticas que se ajusten a tu perfil
        </p>
      </div>

      {/* Sección CV */}
      <div className="mb-8">
        {!hasCv ? (
          <div className="space-y-2">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6 text-brand-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-brand-900">
                  Sube tu CV para activar el matching IA
                </p>
                <p className="text-sm text-brand-700 mt-0.5">
                  Analizamos tu perfil y te mostramos las prácticas con mayor
                  afinidad
                </p>
              </div>
              <label className="bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer hover:bg-brand-700 transition-colors shrink-0">
                {uploading ? "Procesando..." : "Subir CV (PDF o Word)"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                {uploadError}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">
                CV procesado correctamente
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                El matching IA está activo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-green-700 underline cursor-pointer hover:text-green-900 transition-colors">
                Actualizar CV
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={uploading || deleting}
                />
              </label>
              <button
                onClick={handleCVDelete}
                disabled={deleting || uploading}
                className="text-sm text-red-500 underline hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar CV"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-8">
        <button
          onClick={() => setTab("recommendations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "recommendations"
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Recomendadas ({recommendations.length})
        </button>
        <button
          onClick={() => setTab("applications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "applications"
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Mis postulaciones ({applications.length})
        </button>
      </div>

      {/* Contenido tabs */}
      {tab === "recommendations" && (
        <>
          {recommendations.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {recommendations.map((internship) => (
                <InternshipCard key={internship.id} internship={internship} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">
                Sube tu CV para ver recomendaciones
              </p>
              <p className="text-sm text-gray-400 mt-1">
                La IA analizará tu perfil y encontrará las mejores prácticas
                para vos
              </p>
            </div>
          )}
        </>
      )}

      {tab === "applications" && (
        <>
          {applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((application) => {
                const status =
                  STATUS_CONFIG[
                    application.status as keyof typeof STATUS_CONFIG
                  ];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={application.id}
                    className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {application.internship.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {application.internship.company.companyName}
                      </p>
                    </div>

                    {application.matchScore != null &&
                      application.matchScore > 0 && (
                        <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-1 rounded-lg shrink-0">
                          {Math.round(application.matchScore)}% match
                        </span>
                      )}

                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 ${status.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">
                Aún no tenés postulaciones
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Explorá las prácticas disponibles y postulate
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
