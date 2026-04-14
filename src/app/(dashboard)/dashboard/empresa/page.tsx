"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Users,
  Briefcase,
  X,
  Clock,
  XCircle,
  MapPin,
  Calendar,
  Layers,
  Tag,
  ClipboardList,
  CheckCircle2,
  Trash2,
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
    studentProfile?: {
      cvUrl?: string | null;
    } | null;
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
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status } : a)),
        );
      }
    } catch {
      // silencioso — el estado visual no cambia si falla
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
      if (res.ok) {
        setEmailSentIds((prev) => new Set(prev).add(applicationId));
      }
    } catch {
      // silencioso
    }
  };

  const handleViewCV = async (applicationId: string, cvUrl: string) => {
    window.open(cvUrl, "_blank", "noopener noreferrer");
    // Si está PENDING, lo pasamos a REVIEWED automáticamente
    const applicant = applicants.find((a) => a.id === applicationId);
    if (applicant?.status === "PENDING") {
      await updateApplicantStatus(applicationId, "REVIEWED");
    }
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
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
      hasError
        ? "border-red-400 bg-red-50 focus:border-red-500"
        : "border-gray-200 focus:border-brand-400"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Banner estado de empresa */}
      {companyStatus === "PENDING" && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Tu cuenta está en revisión
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Podés crear y gestionar prácticas, pero no serán visibles para
              estudiantes hasta que aprobemos tu empresa. Te avisamos por correo
              cuando esté listo.
            </p>
          </div>
        </div>
      )}
      {companyStatus === "REJECTED" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Cuenta rechazada
            </p>
            <p className="text-sm text-red-700 mt-0.5">
              Tu empresa no fue aprobada. Contactanos a{" "}
              <a
                href="mailto:soporte@practix.cl"
                className="underline font-medium"
              >
                soporte@practix.cl
              </a>{" "}
              para más información.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Empresa</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioná tus prácticas y revisá los postulantes
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva práctica
        </button>
      </div>

      {/* Lista de prácticas */}
      {internships.length === 0 ? (
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">
            Aún no publicaste prácticas
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Creá tu primera oferta y empezá a recibir postulantes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {internships.map((internship) => (
            <div
              key={internship.id}
              onClick={() => setDetailInternship(internship)}
              className={`bg-white rounded-xl border p-5 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-all group ${
                internship.isActive
                  ? "border-gray-100 hover:border-brand-200"
                  : "border-gray-200 bg-gray-50 opacity-75"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium truncate group-hover:text-brand-700 transition-colors ${internship.isActive ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {internship.title}
                  </p>
                  {!internship.isActive && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Completada
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {internship.area} · {internship.location} ·{" "}
                  {internship.modality === "REMOTE"
                    ? "Remoto"
                    : internship.modality === "ONSITE"
                      ? "Presencial"
                      : "Híbrido"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    viewApplicants(internship.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-white hover:bg-brand-600 font-medium border border-brand-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Postulantes
                </button>
                {internship.isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete(internship.id);
                    }}
                    disabled={processing === internship.id}
                    title="Marcar como completada"
                    className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-white hover:bg-green-600 font-medium border border-green-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Completada
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(internship.id);
                  }}
                  disabled={processing === internship.id}
                  title="Eliminar práctica"
                  className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-white hover:bg-red-500 font-medium border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-lg font-semibold text-gray-900 leading-snug">
                  {detailInternship.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {detailInternship.area}
                </p>
              </div>
              <button
                onClick={() => setDetailInternship(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Badges de info */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  {detailInternship.location}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  <Layers className="w-3.5 h-3.5" />
                  {detailInternship.modality === "REMOTE"
                    ? "Remoto"
                    : detailInternship.modality === "ONSITE"
                      ? "Presencial"
                      : "Híbrido"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  {detailInternship.duration}
                </span>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Descripción
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {detailInternship.description}
                </p>
              </div>

              {/* Skills */}
              {detailInternship.skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Skills requeridas
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

              {/* Requisitos */}
              {detailInternship.requirements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
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

              {/* Fecha */}
              <p className="text-xs text-gray-400">
                Publicada el{" "}
                {new Date(detailInternship.createdAt).toLocaleDateString(
                  "es-CL",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  setDetailInternship(null);
                  viewApplicants(detailInternship.id);
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-medium py-2.5 rounded-xl hover:bg-brand-700 transition-colors text-sm cursor-pointer"
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
              <h2 className="text-lg font-semibold text-gray-900">
                Crear práctica
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Título <span className="text-red-500">*</span>
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Descripción <span className="text-red-500">*</span>
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Ubicación <span className="text-red-500">*</span>
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
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Duración <span className="text-red-500">*</span>
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Skills requeridas <span className="text-red-500">*</span>
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Requisitos <span className="text-red-500">*</span>
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
                className="w-full bg-brand-600 text-white font-medium py-2.5 rounded-lg hover:bg-brand-700 transition-colors text-sm disabled:opacity-60 cursor-pointer"
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
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-2">
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
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={processing === confirmDeleteId}
                className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                {processing === confirmDeleteId ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel postulantes */}
      {selectedInternship && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end"
          onClick={() => setSelectedInternship(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Postulantes
              </h2>
              <button
                onClick={() => setSelectedInternship(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applicants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">
                Sin postulaciones aún
              </p>
            ) : (
              <div className="space-y-3">
                {applicants.map((app) => {
                  const initial = app.student.name.charAt(0).toUpperCase();
                  const statusConfig = {
                    PENDING: {
                      label: "Pendiente",
                      cls: "bg-gray-100 text-gray-600",
                    },
                    REVIEWED: {
                      label: "En revisión",
                      cls: "bg-blue-50 text-blue-700",
                    },
                    ACCEPTED: {
                      label: "Aprobado",
                      cls: "bg-green-100 text-green-700",
                    },
                    REJECTED: {
                      label: "Rechazado",
                      cls: "bg-red-100 text-red-600",
                    },
                  }[app.status] ?? {
                    label: app.status,
                    cls: "bg-gray-100 text-gray-600",
                  };

                  return (
                    <div
                      key={app.id}
                      className="border border-gray-100 rounded-xl p-4 space-y-3"
                    >
                      {/* Cabecera */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {app.student.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {app.student.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {app.matchScore != null && app.matchScore > 0 && (
                            <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg">
                              {Math.round(app.matchScore)}%
                            </span>
                          )}
                          <span
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusConfig.cls}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {app.student.studentProfile?.cvUrl && (
                          <button
                            onClick={() =>
                              handleViewCV(
                                app.id,
                                app.student.studentProfile!.cvUrl!,
                              )
                            }
                            className="text-xs font-medium text-brand-600 hover:text-brand-800 border border-brand-200 hover:border-brand-400 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Ver CV →
                          </button>
                        )}
                        {app.status !== "ACCEPTED" &&
                          app.status !== "REJECTED" && (
                            <button
                              onClick={() =>
                                updateApplicantStatus(app.id, "ACCEPTED")
                              }
                              className="text-xs font-medium text-green-700 hover:text-white hover:bg-green-600 border border-green-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Aprobar
                            </button>
                          )}
                        {app.status !== "REJECTED" &&
                          app.status !== "ACCEPTED" && (
                            <button
                              onClick={() =>
                                updateApplicantStatus(app.id, "REJECTED")
                              }
                              className="text-xs font-medium text-red-600 hover:text-white hover:bg-red-500 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Rechazar
                            </button>
                          )}
                        {app.status === "ACCEPTED" &&
                          !emailSentIds.has(app.id) && (
                            <>
                              <button
                                onClick={() =>
                                  sendNotificationEmail(app.id, "accepted")
                                }
                                className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Enviar email de aceptación
                              </button>
                              <button
                                onClick={() =>
                                  updateApplicantStatus(app.id, "REVIEWED")
                                }
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Deshacer
                              </button>
                            </>
                          )}
                        {app.status === "REJECTED" &&
                          !emailSentIds.has(app.id) && (
                            <>
                              <button
                                onClick={() =>
                                  sendNotificationEmail(app.id, "rejected")
                                }
                                className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Enviar email de rechazo
                              </button>
                              <button
                                onClick={() =>
                                  updateApplicantStatus(app.id, "REVIEWED")
                                }
                                className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Deshacer
                              </button>
                            </>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
