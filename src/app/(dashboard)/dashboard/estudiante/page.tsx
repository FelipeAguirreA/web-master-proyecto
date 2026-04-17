"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Upload,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Briefcase,
  Calendar,
  X,
  ChevronRight,
  Star,
  TrendingUp,
  Wand2,
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
  studentProfile?: { cvUrl?: string | null } | null;
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    pill: "bg-[#FFF3EC] text-[#C2410C]",
  },
  REVIEWED: {
    label: "En revisión",
    icon: FileText,
    pill: "bg-[#EDF4FF] text-[#2E5AAC]",
  },
  ACCEPTED: {
    label: "Aceptada",
    icon: CheckCircle2,
    pill: "bg-[#E7F8EA] text-[#1A6E31]",
  },
  REJECTED: {
    label: "Rechazada",
    icon: XCircle,
    pill: "bg-[#FFECEC] text-[#A63418]",
  },
};

const PIPELINE_STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente de revisión",
    pill: "bg-[#F4F3EF] text-[#6D6A63]",
  },
  REVIEWING: { label: "En revisión", pill: "bg-[#EDF4FF] text-[#2E5AAC]" },
  INTERVIEW: {
    label: "¡Seleccionado para entrevista! 🎉",
    pill: "bg-[#E7F8EA] text-[#1A6E31]",
  },
  REJECTED: { label: "No seleccionado", pill: "bg-[#FFECEC] text-[#A63418]" },
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
  const completionPct = hasCv ? 85 : 40;

  const acceptedCount = applications.filter(
    (a) => a.status === "ACCEPTED",
  ).length;

  return (
    <>
      {/* Modal detalle postulación */}
      {selectedApplication && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0909]/50 backdrop-blur-sm"
          onClick={() => setSelectedApplication(null)}
        >
          <div
            className="bg-white rounded-[24px] shadow-[0_24px_64px_-12px_rgba(20,15,10,0.35)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.05] px-6 py-4 flex items-start justify-between gap-4 rounded-t-[24px]">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0A0909] leading-tight truncate">
                  {selectedApplication.internship.title}
                </h2>
                <p className="text-[13px] text-[#6D6A63] mt-0.5">
                  {selectedApplication.internship.company.companyName}
                </p>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-[#6D6A63]" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const st = STATUS_CONFIG[selectedApplication.status];
                  const Icon = st.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-full ${st.pill}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {st.label}
                    </span>
                  );
                })()}
                {selectedApplication.matchScore != null &&
                  selectedApplication.matchScore > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-gradient-to-br from-[#FFF3EC] to-[#FFE9B3]/60 text-[#C2410C] px-3 py-1.5 rounded-full border border-[#FF6A3D]/15">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(selectedApplication.matchScore)}%
                      compatibilidad
                    </span>
                  )}
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#6D6A63] bg-[#FAFAF8] px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  Postulado el{" "}
                  {new Date(selectedApplication.createdAt).toLocaleDateString(
                    "es-CL",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  [MapPin, selectedApplication.internship.location],
                  [
                    Briefcase,
                    MODALITY_LABEL[selectedApplication.internship.modality],
                  ],
                  [FileText, selectedApplication.internship.area],
                  [Clock, selectedApplication.internship.duration],
                ].map(([Icon, label], i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[13px] text-[#4A4843]"
                  >
                    {/* @ts-expect-error icon is a component */}
                    <Icon className="w-4 h-4 text-[#FF6A3D]/70 shrink-0" />
                    {label as string}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                  <h3 className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                    Descripción
                  </h3>
                </div>
                <p className="text-[13px] text-[#4A4843] leading-[1.65] whitespace-pre-line">
                  {selectedApplication.internship.description}
                </p>
              </div>

              {selectedApplication.internship.requirements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <h3 className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                      Requisitos
                    </h3>
                  </div>
                  <ul className="space-y-1.5">
                    {selectedApplication.internship.requirements.map(
                      (req, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-[#4A4843]"
                        >
                          <span className="w-1 h-1 rounded-full bg-[#FF6A3D] mt-2 shrink-0" />
                          {req}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              {selectedApplication.internship.skills.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <h3 className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                      Habilidades requeridas
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApplication.internship.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11.5px] font-medium bg-[#F4F3EF] text-[#4A4843] px-2.5 py-1 rounded-lg"
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

      <div className="pt-8 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex flex-col gap-8">
        {/* Hero bienvenida */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF6A3D] mb-2">
              Tu panel ·{" "}
              {new Date().toLocaleDateString("es-CL", { weekday: "long" })}
            </p>
            <h1 className="text-[36px] md:text-[44px] font-bold tracking-[-0.03em] text-[#0A0909] leading-[1.05]">
              Hola,{" "}
              <span className="bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
                {name}
              </span>{" "}
              👋
            </h1>
            <p className="text-[14.5px] text-[#6D6A63] mt-2 max-w-[520px] leading-[1.55]">
              {recommendations.length > 0
                ? `Tenemos ${recommendations.length} recomendaciones alineadas a tu perfil. Revisalas cuanto antes — las buenas vuelan.`
                : "Subí tu CV para activar el matching IA y recibir recomendaciones personalizadas."}
            </p>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-2xl border border-black/[0.06] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-w-[120px]">
              <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[#9B9891]">
                Postulaciones
              </p>
              <p className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909] mt-1 leading-none">
                {applications.length}
              </p>
              {acceptedCount > 0 && (
                <p className="text-[11px] font-medium text-[#1A8F3C] mt-1 inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" strokeWidth={2.4} />
                  {acceptedCount} aceptada{acceptedCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-w-[140px]">
              <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-[#9B9891]">
                Perfil
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-[22px] font-bold tracking-[-0.02em] text-[#0A0909] leading-none">
                  {completionPct}
                </p>
                <span className="text-[12px] font-medium text-[#9B9891]">
                  %
                </span>
              </div>
              <div className="w-full h-1 bg-[#F4F3EF] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A]"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Banner CV */}
        {!hasCv ? (
          <section className="relative overflow-hidden rounded-[24px] border border-[#FF6A3D]/15 bg-gradient-to-br from-[#FFF7F2] via-white to-[#FFEDE0] p-7 md:p-8">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.3),transparent_70%)] blur-[50px]" />
              <div className="absolute -bottom-16 -left-12 w-[280px] h-[280px] rounded-full bg-[radial-gradient(closest-side,rgba(255,220,180,0.5),transparent_70%)] blur-[40px]" />
            </div>
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-5 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center shrink-0 shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)]">
                  <Wand2 className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#FF6A3D] mb-1">
                    Activá el matching IA
                  </p>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[#0A0909] leading-tight">
                    Subí tu CV y dejá que la IA encuentre tus prácticas ideales
                  </h3>
                  <p className="text-[13px] text-[#6D6A63] mt-1.5 max-w-[480px] leading-[1.55]">
                    Analizamos tus habilidades y experiencia para conectarte con
                    las vacantes que mejor calzan con tu perfil.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto shrink-0">
                <label className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white px-6 py-3 rounded-xl font-semibold text-[13.5px] cursor-pointer shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all">
                  <Upload className="w-4 h-4" strokeWidth={2.3} />
                  {uploading ? "Procesando…" : "Subir CV (PDF o DOCX)"}
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleCVUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {uploadError && (
                  <p className="text-[11.5px] text-[#A63418] font-medium text-center md:text-right">
                    {uploadError}
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D3E9C7] to-[#6BB85A] flex items-center justify-center shrink-0 shadow-[0_4px_12px_-2px_rgba(107,184,90,0.35)]">
              <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                CV procesado · matching IA activo
              </p>
              <p className="text-[12px] text-[#6D6A63] mt-0.5">
                Tus recomendaciones se actualizan automáticamente según nuevas
                vacantes.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-semibold shrink-0">
              <label className="text-[#FF6A3D] hover:text-[#FF5A28] cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FFF3EC]">
                Actualizar CV
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={uploading || deleting}
                />
              </label>
              <span className="w-px h-4 bg-black/[0.08]" />
              <button
                onClick={handleCVDelete}
                disabled={deleting || uploading}
                className="text-[#6D6A63] hover:text-[#C2410C] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#FFF0ED] disabled:opacity-50"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </section>
        )}

        {/* Tabs + contenido */}
        <section>
          <div className="flex items-center gap-1 bg-black/[0.03] rounded-2xl p-1 w-fit mb-7">
            <button
              onClick={() => setTab("recommendations")}
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-all ${
                tab === "recommendations"
                  ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-[#6D6A63] hover:text-[#0A0909]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
              Recomendadas
              <span
                className={`text-[10.5px] px-1.5 py-0.5 rounded-md ${
                  tab === "recommendations"
                    ? "bg-[#FFF3EC] text-[#FF6A3D]"
                    : "bg-white/60 text-[#9B9891]"
                }`}
              >
                {recommendations.length}
              </span>
            </button>
            <button
              onClick={() => setTab("applications")}
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-xl transition-all ${
                tab === "applications"
                  ? "bg-white text-[#0A0909] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-[#6D6A63] hover:text-[#0A0909]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={2.2} />
              Mis postulaciones
              <span
                className={`text-[10.5px] px-1.5 py-0.5 rounded-md ${
                  tab === "applications"
                    ? "bg-[#FFF3EC] text-[#FF6A3D]"
                    : "bg-white/60 text-[#9B9891]"
                }`}
              >
                {applications.length}
              </span>
            </button>
          </div>

          {tab === "recommendations" && (
            <>
              {recommendations.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {recommendations.map((internship) => (
                    <InternshipCard
                      key={internship.id}
                      internship={internship}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-black/[0.06] text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAFAF8] flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-[#C9C6BF]" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                    Todavía no hay recomendaciones
                  </p>
                  <p className="text-[13px] text-[#6D6A63] mt-1 max-w-[340px] mx-auto">
                    Subí tu CV y la IA encontrará las mejores prácticas para tu
                    perfil.
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "applications" && applications.length > 0 && (
            <ApplicationList
              items={applications}
              onSelect={setSelectedApplication}
            />
          )}

          {tab === "applications" && applications.length === 0 && (
            <div className="bg-white rounded-[24px] border border-black/[0.06] text-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-[#FAFAF8] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-[#C9C6BF]" />
              </div>
              <p className="text-[15px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                Aún no tenés postulaciones
              </p>
              <p className="text-[13px] text-[#6D6A63] mt-1">
                Explorá las prácticas disponibles y postulate a las que te
                interesen.
              </p>
            </div>
          )}
        </section>

        {/* Actividad reciente */}
        {tab === "recommendations" && applications.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#9B9891] mb-1">
                  Historial
                </p>
                <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#0A0909]">
                  Actividad reciente
                </h2>
              </div>
              <button
                onClick={() => setTab("applications")}
                className="text-[12px] font-semibold text-[#FF6A3D] hover:text-[#FF5A28] transition-colors inline-flex items-center gap-1"
              >
                Ver todo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <ApplicationList
              items={applications.slice(0, 3)}
              onSelect={setSelectedApplication}
            />
          </section>
        )}
      </div>
    </>
  );
}

function ApplicationList({
  items,
  onSelect,
}: {
  items: ApplicationWithInternship[];
  onSelect: (a: ApplicationWithInternship) => void;
}) {
  return (
    <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      {items.map((application, i) => {
        const status =
          STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG];
        const StatusIcon = status.icon;
        const companyName = application.internship.company.companyName;
        const initial = companyName.charAt(0).toUpperCase();
        const pipeline =
          application.pipelineStatus && application.pipelineStatus !== "PENDING"
            ? PIPELINE_STATUS_CONFIG[
                application.pipelineStatus as keyof typeof PIPELINE_STATUS_CONFIG
              ]
            : null;

        return (
          <button
            key={application.id}
            onClick={() => onSelect(application)}
            className={`w-full px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAF8] transition-colors text-left ${
              i < items.length - 1 ? "border-b border-black/[0.04]" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE9B3] to-[#FFC84A] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)]">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0A0909] truncate">
                  {application.internship.title}
                </p>
                <p className="text-[12px] text-[#6D6A63] truncate mt-0.5">
                  {companyName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {application.matchScore != null && application.matchScore > 0 && (
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891]">
                    Match
                  </span>
                  <span className="text-[12.5px] font-bold text-[#FF6A3D] inline-flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-[#FFC84A] text-[#FFC84A]" />
                    {Math.round(application.matchScore)}%
                  </span>
                </div>
              )}

              <div className="flex flex-col items-end min-w-[140px]">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891] mb-1">
                  Estado
                </span>
                {pipeline ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${pipeline.pill}`}
                  >
                    {pipeline.label}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full ${status.pill}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-[#C9C6BF] shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
