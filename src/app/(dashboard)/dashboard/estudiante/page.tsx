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
  MapPin,
  Briefcase,
  Calendar,
  X,
  MoreVertical,
  Star,
} from "lucide-react";
import InternshipCard from "@/components/ui/InternshipCard";
import type { Internship, Application } from "@/types";

type InternshipWithCompany = Internship & {
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
};

type InternshipDetail = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  requirements: string[];
  skills: string[];
  company: { companyName: string; logo: string | null };
};

type ApplicationWithInternship = Application & {
  internship: InternshipDetail;
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
    color: "text-amber-700 bg-amber-100",
  },
  REVIEWED: {
    label: "En revisión",
    icon: FileText,
    color: "text-blue-700 bg-blue-100",
  },
  ACCEPTED: {
    label: "Aceptada",
    icon: CheckCircle,
    color: "text-green-700 bg-green-100",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    color: "text-red-700 bg-red-100",
  },
};

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
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
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationWithInternship | null>(null);

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
    <>
      {/* Modal detalle postulación */}
      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedApplication.internship.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedApplication.internship.company.companyName}
                </p>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const st = STATUS_CONFIG[selectedApplication.status];
                  const Icon = st.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${st.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {st.label}
                    </span>
                  );
                })()}
                {selectedApplication.matchScore != null &&
                  selectedApplication.matchScore > 0 && (
                    <span className="inline-flex items-center text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                      {Math.round(selectedApplication.matchScore)}%
                      compatibilidad
                    </span>
                  )}
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5" />
                  Postulado el{" "}
                  {new Date(selectedApplication.createdAt).toLocaleDateString(
                    "es-CL",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  {selectedApplication.internship.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                  {MODALITY_LABEL[selectedApplication.internship.modality]}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  {selectedApplication.internship.area}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  {selectedApplication.internship.duration}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Descripción
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {selectedApplication.internship.description}
                </p>
              </div>

              {selectedApplication.internship.requirements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Requisitos
                  </h3>
                  <ul className="space-y-1">
                    {selectedApplication.internship.requirements.map(
                      (req, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-gray-600"
                        >
                          <span className="text-brand-500 font-bold mt-0.5 shrink-0">
                            ·
                          </span>
                          {req}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {selectedApplication.internship.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Habilidades requeridas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication.internship.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pt-8 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex flex-col gap-10">
        {/* Bienvenida */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-gray-900">
              Hola, {name} 👋
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              {recommendations.length > 0
                ? `Tenés ${recommendations.length} recomendaciones basadas en tu perfil.`
                : "Subí tu CV para activar las recomendaciones personalizadas."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 font-bold rounded-full text-xs w-fit">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Perfil {hasCv ? "85" : "40"}% completado
          </span>
        </section>

        {/* Banner CV */}
        {!hasCv ? (
          <section className="relative bg-brand-50 border border-brand-100 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-brand-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center shrink-0">
                <Upload className="w-7 h-7 text-brand-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Sube tu CV para activar el matching IA
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Analizaremos tus habilidades para conectarte con las mejores
                  vacantes.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-end gap-2">
              <label className="bg-brand-600 text-white px-7 py-3.5 rounded-xl font-semibold text-sm cursor-pointer hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? "Procesando..." : "Subir CV (PDF o DOCX)"}
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
              )}
            </div>
          </section>
        ) : (
          <section className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">
                CV procesado — matching IA activo
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Tus recomendaciones se actualizan automáticamente
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="text-brand-600 hover:text-brand-700 cursor-pointer transition-colors">
                Actualizar CV
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={uploading || deleting}
                />
              </label>
              <button
                onClick={handleCVDelete}
                disabled={deleting || uploading}
                className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar CV"}
              </button>
            </div>
          </section>
        )}

        {/* Tabs + contenido */}
        <section>
          <div className="flex gap-8 border-b border-gray-200 mb-8">
            <button
              onClick={() => setTab("recommendations")}
              className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                tab === "recommendations"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Recomendadas ({recommendations.length})
            </button>
            <button
              onClick={() => setTab("applications")}
              className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                tab === "applications"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <FileText className="w-4 h-4" />
              Mis postulaciones ({applications.length})
            </button>
          </div>

          {tab === "recommendations" && (
            <>
              {recommendations.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-5">
                  {recommendations.map((internship) => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-lg font-bold text-gray-500">
                    Todavía no hay recomendaciones
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Subí tu CV y la IA encontrará las mejores prácticas para vos
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "applications" && applications.length > 0 && (
            <div className="flex flex-col gap-px bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {applications.map((application) => {
                const status =
                  STATUS_CONFIG[
                    application.status as keyof typeof STATUS_CONFIG
                  ];
                const StatusIcon = status.icon;
                const initial = application.internship.company.companyName
                  .charAt(0)
                  .toUpperCase();

                return (
                  <button
                    key={application.id}
                    onClick={() => setSelectedApplication(application)}
                    className="bg-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand-600 shrink-0 text-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate text-sm">
                          {application.internship.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {application.internship.company.companyName}
                        </p>
                      </div>
                    </div>

                    {/* Match + estado + menú */}
                    <div className="flex items-center gap-6">
                      {application.matchScore != null &&
                        application.matchScore > 0 && (
                          <div className="hidden lg:flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase text-gray-400 mb-0.5">
                              Compatibilidad
                            </span>
                            <span className="text-xs font-bold text-amber-600">
                              {Math.round(application.matchScore)}% Match
                            </span>
                          </div>
                        )}

                      <div className="flex flex-col items-end min-w-[120px]">
                        <span className="text-[10px] font-black uppercase text-gray-400 mb-0.5">
                          Estado
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      <MoreVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "applications" && applications.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-lg font-bold text-gray-500">
                Aún no tenés postulaciones
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Explorá las prácticas disponibles y postulate
              </p>
            </div>
          )}
        </section>

        {/* Actividad reciente (cuando hay postulaciones y está en tab recomendaciones) */}
        {tab === "recommendations" && applications.length > 0 && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-gray-900">
                Actividad Reciente
              </h2>
              <button
                onClick={() => setTab("applications")}
                className="text-xs font-bold uppercase tracking-widest text-brand-600 hover:underline"
              >
                Ver todo el historial
              </button>
            </div>

            <div className="flex flex-col gap-px bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {applications.slice(0, 3).map((application) => {
                const status =
                  STATUS_CONFIG[
                    application.status as keyof typeof STATUS_CONFIG
                  ];
                const StatusIcon = status.icon;
                const initial = application.internship.company.companyName
                  .charAt(0)
                  .toUpperCase();

                return (
                  <button
                    key={application.id}
                    onClick={() => setSelectedApplication(application)}
                    className="bg-white px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand-600 shrink-0 text-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate text-sm">
                          {application.internship.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {application.internship.company.companyName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {application.matchScore != null &&
                        application.matchScore > 0 && (
                          <div className="hidden lg:flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase text-gray-400 mb-0.5">
                              Compatibilidad
                            </span>
                            <span className="text-xs font-bold text-amber-600">
                              {Math.round(application.matchScore)}% Match
                            </span>
                          </div>
                        )}

                      <div className="flex flex-col items-end min-w-[120px]">
                        <span className="text-[10px] font-black uppercase text-gray-400 mb-0.5">
                          Estado
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      <MoreVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
