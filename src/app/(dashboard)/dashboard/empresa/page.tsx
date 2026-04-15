"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Plus,
  Users,
  Briefcase,
  X,
  XCircle,
  MapPin,
  Calendar,
  Layers,
  Tag,
  ClipboardList,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Bot,
} from "lucide-react";

type Internship = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: string;
  duration: string;
  skills: string[];
  requirements: string[];
  isActive: boolean;
  createdAt: string;
};

type Applicant = {
  id: string;
  matchScore?: number | null;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: { cvUrl?: string | null } | null;
  };
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
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  area: AREAS[0],
  location: "",
  modality: "REMOTE",
  duration: "",
  skills: "",
  requirements: "",
};

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

const STATUS_CONFIG = {
  PENDING: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  REVIEWED: { label: "En revisión", cls: "bg-blue-100 text-blue-700" },
  ACCEPTED: { label: "Aprobado", cls: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado", cls: "bg-red-100 text-red-600" },
};

export default function CompanyDashboard() {
  const { data: session } = useSession();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailInternship, setDetailInternship] = useState<Internship | null>(
    null,
  );
  const [selectedInternship, setSelectedInternship] = useState<string | null>(
    null,
  );
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof typeof EMPTY_FORM, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [emailSentIds, setEmailSentIds] = useState<Set<string>>(new Set());

  const loadInternships = async () => {
    try {
      const res = await fetch("/api/company/internships");
      const data = await res.json();
      setInternships(data.internships ?? []);
      if (data.companyStatus) setCompanyStatus(data.companyStatus);
    } catch {
      setInternships([]);
    }
  };

  useEffect(() => {
    if (session) loadInternships();
  }, [session]);

  const validateForm = (): Partial<Record<keyof typeof EMPTY_FORM, string>> => {
    const errs: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!form.title.trim() || form.title.trim().length < 3)
      errs.title = "El título debe tener al menos 3 caracteres";
    if (!form.description.trim() || form.description.trim().length < 20)
      errs.description = "La descripción debe tener al menos 20 caracteres";
    if (!form.location.trim()) errs.location = "La ubicación es obligatoria";
    if (!form.duration.trim()) errs.duration = "La duración es obligatoria";
    if (!form.skills.trim()) errs.skills = "Ingresá al menos una skill";
    if (!form.requirements.trim())
      errs.requirements = "Ingresá al menos un requisito";
    return errs;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setSubmitting(true);
    const toArray = (str: string) =>
      str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: toArray(form.skills),
          requirements: toArray(form.requirements),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        setFormErrors({});
        await loadInternships();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (internshipId: string) => {
    setProcessing(internshipId);
    try {
      const res = await fetch(`/api/internships/${internshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setInternships((prev) =>
          prev.map((i) =>
            i.id === internshipId ? { ...i, isActive: false } : i,
          ),
        );
        if (detailInternship?.id === internshipId)
          setDetailInternship((d) => (d ? { ...d, isActive: false } : null));
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setProcessing(confirmDeleteId);
    try {
      const res = await fetch(`/api/internships/${confirmDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInternships((prev) => prev.filter((i) => i.id !== confirmDeleteId));
        if (detailInternship?.id === confirmDeleteId) setDetailInternship(null);
        if (selectedInternship === confirmDeleteId) setSelectedInternship(null);
      }
    } finally {
      setProcessing(null);
      setConfirmDeleteId(null);
    }
  };

  const viewApplicants = async (internshipId: string) => {
    setSelectedInternship(internshipId);
    try {
      const res = await fetch(`/api/applications/internship/${internshipId}`);
      const data = await res.json();
      setApplicants(data ?? []);
    } catch {
      setApplicants([]);
    }
  };

  const updateApplicantStatus = async (
    applicationId: string,
    status: "REVIEWED" | "ACCEPTED" | "REJECTED",
  ) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok)
        setApplicants((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
        );
    } catch {
      /* silencioso */
    }
  };

  const sendNotificationEmail = async (
    applicationId: string,
    type: "accepted" | "rejected",
  ) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) setEmailSentIds((prev) => new Set(prev).add(applicationId));
    } catch {
      /* silencioso */
    }
  };

  const handleViewCV = async (applicationId: string, cvUrl: string) => {
    window.open(cvUrl, "_blank", "noopener noreferrer");
    const applicant = applicants.find((a) => a.id === applicationId);
    if (applicant?.status === "PENDING")
      await updateApplicantStatus(applicationId, "REVIEWED");
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setFormErrors((errs) => ({ ...errs, [key]: undefined }));
    },
  });

  const inputClass = (hasError?: boolean) =>
    `w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${
      hasError
        ? "border-red-400 bg-red-50 focus:border-red-500"
        : "border-gray-200 focus:border-brand-400 bg-white"
    }`;

  const selectedName = selectedInternship
    ? internships.find((i) => i.id === selectedInternship)?.title
    : null;

  return (
    <div className="pt-8 pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex flex-col gap-6">
      {/* Banner estado */}
      {companyStatus === "PENDING" && (
        <div className="flex items-center justify-center gap-3 bg-amber-400 text-white px-5 py-3 rounded-2xl text-sm font-semibold -mx-8 px-8">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Tu cuenta está en revisión — las prácticas no serán visibles hasta su
          aprobación.
        </div>
      )}
      {companyStatus === "REJECTED" && (
        <div className="flex items-center justify-center gap-3 bg-red-500 text-white px-5 py-3 rounded-2xl text-sm font-semibold">
          <XCircle className="w-4 h-4 shrink-0" />
          Cuenta rechazada. Contactá a soporte@practix.cl para más información.
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-gray-900">
            Panel de Empresa
          </h1>
          <p className="text-gray-400 mt-1">
            Gestioná tus vacantes y encontrá el mejor talento joven.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
        >
          <Plus className="w-4 h-4" />
          Nueva práctica
        </button>
      </div>

      {/* Split layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de prácticas */}
        <div className="lg:col-span-2 flex flex-col gap-px bg-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {internships.length === 0 ? (
            <div className="bg-white text-center py-20 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-lg font-bold text-gray-500">
                Aún no publicaste prácticas
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Creá tu primera oferta y empezá a recibir postulantes
              </p>
            </div>
          ) : (
            internships.map((internship) => (
              <div
                key={internship.id}
                onClick={() => setDetailInternship(internship)}
                className={`bg-white px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedInternship === internship.id
                    ? "border-l-4 border-brand-600"
                    : ""
                }`}
              >
                {/* Icon + info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate text-sm">
                        {internship.title}
                      </p>
                      {!internship.isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-700 px-2.5 py-1 rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Completada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {MODALITY_LABEL[internship.modality]}
                      </span>
                      <span>·</span>
                      <span>{internship.area}</span>
                      <span>·</span>
                      <span>{internship.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div
                  className="flex items-center gap-2 shrink-0 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => viewApplicants(internship.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                      selectedInternship === internship.id
                        ? "bg-brand-600 text-white border-brand-600"
                        : "text-brand-600 border-brand-200 hover:bg-brand-600 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Postulantes
                  </button>
                  <Link
                    href={`/dashboard/empresa/ats/${internship.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-600 hover:text-white transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    ATS
                  </Link>
                  {internship.isActive && (
                    <button
                      onClick={() => handleComplete(internship.id)}
                      disabled={processing === internship.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-600 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completada
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(internship.id)}
                    disabled={processing === internship.id}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel postulantes (siempre visible) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Postulantes
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5 truncate max-w-[180px]">
                {selectedName ?? "Seleccioná una práctica"}
              </p>
            </div>
            {applicants.length > 0 && (
              <span className="text-xs font-black bg-brand-600 text-white px-2.5 py-1 rounded-full">
                {applicants.length} Total
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {!selectedInternship ? (
              <div className="text-center py-16 px-4">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  Hacé click en &quot;Postulantes&quot; de una práctica para ver
                  los candidatos
                </p>
              </div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Sin postulaciones aún</p>
              </div>
            ) : (
              applicants.map((app) => {
                const initial = app.student.name.charAt(0).toUpperCase();
                const statusCfg =
                  STATUS_CONFIG[app.status] ?? STATUS_CONFIG.PENDING;

                return (
                  <div key={app.id} className="px-5 py-4 flex flex-col gap-3">
                    {/* Cabecera candidato */}
                    <div className="flex items-center gap-3">
                      {app.student.image ? (
                        <img
                          src={app.student.image}
                          alt={app.student.name}
                          className="w-10 h-10 rounded-full border-2 border-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {app.student.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {app.student.email}
                        </p>
                      </div>
                    </div>

                    {/* Match + estado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.matchScore != null && app.matchScore > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          {Math.round(app.matchScore)}% MATCH IA
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusCfg.cls}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2 flex-wrap">
                      {app.student.studentProfile?.cvUrl && (
                        <button
                          onClick={() =>
                            handleViewCV(
                              app.id,
                              app.student.studentProfile!.cvUrl!,
                            )
                          }
                          className="text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Ver CV →
                        </button>
                      )}
                      {app.status !== "ACCEPTED" &&
                        app.status !== "REJECTED" && (
                          <>
                            <button
                              onClick={() =>
                                updateApplicantStatus(app.id, "ACCEPTED")
                              }
                              className="flex-1 text-xs font-bold bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() =>
                                updateApplicantStatus(app.id, "REJECTED")
                              }
                              className="flex-1 text-xs font-bold bg-white text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      {app.status === "ACCEPTED" &&
                        !emailSentIds.has(app.id) && (
                          <button
                            onClick={() =>
                              sendNotificationEmail(app.id, "accepted")
                            }
                            className="w-full text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Enviar email de aceptación
                          </button>
                        )}
                      {app.status === "REJECTED" &&
                        !emailSentIds.has(app.id) && (
                          <button
                            onClick={() =>
                              sendNotificationEmail(app.id, "rejected")
                            }
                            className="w-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Enviar email de rechazo
                          </button>
                        )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {applicants.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button className="w-full text-xs font-bold text-brand-600 hover:underline">
                Ver todos los postulantes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle práctica */}
      {detailInternship && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailInternship(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  {detailInternship.title}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {detailInternship.area}
                </p>
              </div>
              <button
                onClick={() => setDetailInternship(null)}
                className="text-gray-300 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {detailInternship.location}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                  <Layers className="w-3.5 h-3.5" />
                  {MODALITY_LABEL[detailInternship.modality]}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  {detailInternship.duration}
                </span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Descripción
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {detailInternship.description}
                </p>
              </div>
              {detailInternship.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detailInternship.skills.map((s) => (
                      <span
                        key={s}
                        className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detailInternship.requirements?.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Requisitos
                  </p>
                  <ul className="space-y-1.5">
                    {detailInternship.requirements.map((r) => (
                      <li
                        key={r}
                        className="text-sm text-gray-700 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-gray-400">
                Publicada el{" "}
                {new Date(detailInternship.createdAt).toLocaleDateString(
                  "es-CL",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  setDetailInternship(null);
                  viewApplicants(detailInternship.id);
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 transition-colors text-sm"
              >
                <Users className="w-4 h-4" />
                Ver postulantes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal creación */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowForm(false);
            setFormErrors({});
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Crear práctica
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormErrors({});
                }}
                className="text-gray-300 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Título *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pasantía Frontend Developer"
                  className={inputClass(!!formErrors.title)}
                  {...field("title")}
                />
                {formErrors.title && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Descripción *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describí las tareas y el contexto del puesto"
                  className={inputClass(!!formErrors.description)}
                  {...field("description")}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Área
                  </label>
                  <select className={inputClass()} {...field("area")}>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Modalidad
                  </label>
                  <select className={inputClass()} {...field("modality")}>
                    {MODALITIES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Ubicación *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Santiago"
                    className={inputClass(!!formErrors.location)}
                    {...field("location")}
                  />
                  {formErrors.location && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.location}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                    Duración *
                  </label>
                  <input
                    type="text"
                    placeholder="3 meses"
                    className={inputClass(!!formErrors.duration)}
                    {...field("duration")}
                  />
                  {formErrors.duration && (
                    <p className="text-xs text-red-600 mt-1">
                      {formErrors.duration}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Skills requeridas *
                </label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js"
                  className={inputClass(!!formErrors.skills)}
                  {...field("skills")}
                />
                {formErrors.skills && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.skills}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Requisitos *
                </label>
                <input
                  type="text"
                  placeholder="Estudiante Ing. Informática, 4to año+"
                  className={inputClass(!!formErrors.requirements)}
                  {...field("requirements")}
                />
                {formErrors.requirements && (
                  <p className="text-xs text-red-600 mt-1">
                    {formErrors.requirements}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 transition-colors text-sm disabled:opacity-60"
              >
                {submitting ? "Publicando..." : "Publicar práctica"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
              Eliminar práctica
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              ¿Seguro que querés eliminar esta práctica? Se borrarán también
              todas las postulaciones asociadas. Esta acción no se puede
              deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={processing === confirmDeleteId}
                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-60"
              >
                {processing === confirmDeleteId ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
