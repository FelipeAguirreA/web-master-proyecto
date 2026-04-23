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
  TrendingUp,
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
  student: {
    name: string;
    email: string;
    image?: string | null;
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

const INPUT_CLS = (hasError?: boolean) =>
  hasError
    ? "w-full rounded-xl px-4 py-2.5 text-[13.5px] bg-[#FFF0ED] border border-[#FF6A3D]/30 focus:outline-none focus:border-[#FF6A3D] focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]"
    : "w-full rounded-xl px-4 py-2.5 text-[13.5px] bg-[#FAFAF8] border border-transparent hover:border-black/[0.05] focus:outline-none focus:border-[#FF6A3D]/40 focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,106,61,0.08)] transition-all placeholder:text-[#9B9891] text-[#0A0909]";

const LABEL_CLS =
  "block text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] mb-1.5";

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

  const selectedName = selectedInternship
    ? internships.find((i) => i.id === selectedInternship)?.title
    : null;

  const activeCount = internships.filter((i) => i.isActive).length;
  const completedCount = internships.length - activeCount;

  return (
    <div className="pt-6 sm:pt-8 pb-12 sm:pb-20 px-4 md:px-8 max-w-screen-2xl mx-auto flex flex-col gap-5 sm:gap-6">
      {/* Status banners */}
      {companyStatus === "PENDING" && (
        <div className="relative overflow-hidden rounded-2xl border border-[#FFBD2E]/25 bg-gradient-to-r from-[#FFF8E6] to-[#FFF3EC] px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFE9B3] to-[#FFBD2E] flex items-center justify-center shrink-0 shadow-[0_4px_10px_-2px_rgba(255,189,46,0.35)]">
            <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[#0A0909]">
              Cuenta en revisión
            </p>
            <p className="text-[12.5px] text-[#6D6A63] mt-0.5">
              Tus prácticas no serán visibles para estudiantes hasta que
              aprobemos tu empresa.
            </p>
          </div>
        </div>
      )}
      {companyStatus === "REJECTED" && (
        <div className="relative overflow-hidden rounded-2xl border border-[#FF6A3D]/25 bg-gradient-to-r from-[#FFECEC] to-[#FFF0ED] px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFCDCD] to-[#FF6B6B] flex items-center justify-center shrink-0 shadow-[0_4px_10px_-2px_rgba(255,107,107,0.4)]">
            <XCircle className="w-4 h-4 text-white" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[#0A0909]">
              Cuenta rechazada
            </p>
            <p className="text-[12.5px] text-[#6D6A63] mt-0.5">
              Contactá a{" "}
              <a
                href="mailto:soporte@practix.cl"
                className="text-[#FF6A3D] font-semibold hover:underline"
              >
                soporte@practix.cl
              </a>{" "}
              para más información.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF6A3D] mb-2">
            Panel empresa
          </p>
          <h1 className="text-[26px] sm:text-[34px] md:text-[40px] font-bold tracking-[-0.03em] text-[#0A0909] leading-[1.05]">
            Gestioná tu{" "}
            <span className="bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
              talento
            </span>
          </h1>
          <p className="text-[13px] sm:text-[14px] text-[#6D6A63] mt-2 max-w-[520px] leading-[1.55]">
            Publicá vacantes, revisá postulaciones rankeadas por IA y encontrá
            al candidato ideal para tu equipo.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-black/[0.06] px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-[9.5px] sm:text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9B9891]">
                Activas
              </p>
              <p className="text-[17px] sm:text-[20px] font-bold tracking-[-0.02em] text-[#0A0909] leading-none mt-0.5">
                {activeCount}
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl border border-black/[0.06] px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-[9.5px] sm:text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9B9891]">
                Completadas
              </p>
              <p className="text-[17px] sm:text-[20px] font-bold tracking-[-0.02em] text-[#0A0909] leading-none mt-0.5">
                {completedCount}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[12.5px] sm:text-[13px] font-semibold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nueva práctica
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
        {/* Lista prácticas */}
        <div className="md:col-span-2">
          {internships.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-black/[0.06] text-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFF3EC] to-[#FFE9B3]/60 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-6 h-6 text-[#FF6A3D]" />
              </div>
              <p className="text-[15px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                Aún no publicaste prácticas
              </p>
              <p className="text-[13px] text-[#6D6A63] mt-1 max-w-[360px] mx-auto">
                Creá tu primera oferta y empezá a recibir candidatos rankeados
                por la IA.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#FF6A3D] hover:text-[#FF5A28] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                Crear primera práctica
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              {internships.map((internship, idx) => (
                <div
                  key={internship.id}
                  onClick={() => setDetailInternship(internship)}
                  className={`relative px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:bg-[#FAFAF8] transition-colors ${
                    idx < internships.length - 1
                      ? "border-b border-black/[0.04]"
                      : ""
                  } ${selectedInternship === internship.id ? "bg-[#FFF7F2]" : ""}`}
                >
                  {selectedInternship === internship.id && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A]" />
                  )}

                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        internship.isActive
                          ? "bg-gradient-to-br from-[#FFF3EC] to-[#FFE9B3]/50"
                          : "bg-[#F4F3EF]"
                      }`}
                    >
                      <Briefcase
                        className={`w-5 h-5 ${
                          internship.isActive
                            ? "text-[#FF6A3D]"
                            : "text-[#9B9891]"
                        }`}
                        strokeWidth={2.2}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0A0909] truncate">
                          {internship.title}
                        </p>
                        {!internship.isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#E7F8EA] text-[#1A6E31] px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Completada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11.5px] text-[#6D6A63] mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {MODALITY_LABEL[internship.modality]}
                        </span>
                        <span className="w-px h-3 bg-black/[0.08]" />
                        <span>{internship.area}</span>
                        <span className="w-px h-3 bg-black/[0.08]" />
                        <span>{internship.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => viewApplicants(internship.id)}
                      className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        selectedInternship === internship.id
                          ? "bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white shadow-[0_4px_12px_-2px_rgba(255,106,61,0.4)]"
                          : "text-[#FF6A3D] hover:bg-[#FFF3EC]"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" strokeWidth={2.4} />
                      Postulantes
                    </button>
                    <Link
                      href={`/dashboard/empresa/ats/${internship.id}`}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#5B2FA6] bg-[#F3EEFF] hover:bg-[#E7DEFF] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" strokeWidth={2.4} />
                      ATS
                    </Link>
                    {internship.isActive && (
                      <button
                        onClick={() => handleComplete(internship.id)}
                        disabled={processing === internship.id}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1A6E31] hover:bg-[#E7F8EA] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          strokeWidth={2.4}
                        />
                        Cerrar
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(internship.id)}
                      disabled={processing === internship.id}
                      className="w-8 h-8 inline-flex items-center justify-center text-[#9B9891] hover:text-[#C2410C] hover:bg-[#FFF0ED] rounded-lg transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel postulantes */}
        <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[720px]">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-[#9B9891]">
                Postulantes
              </p>
              <p className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em] mt-0.5 truncate">
                {selectedName ?? "Seleccioná una práctica"}
              </p>
            </div>
            {applicants.length > 0 && (
              <span className="text-[11px] font-bold bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white px-2.5 py-1 rounded-full shadow-[0_2px_6px_-1px_rgba(255,106,61,0.4)] shrink-0">
                {applicants.length} total
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedInternship ? (
              <div className="text-center py-16 px-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAFAF8] flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-[#C9C6BF]" />
                </div>
                <p className="text-[12.5px] text-[#6D6A63] leading-[1.5]">
                  Hacé click en <b>&quot;Postulantes&quot;</b> de una práctica
                  para ver los candidatos.
                </p>
              </div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-16 px-5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAFAF8] flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-[#C9C6BF]" />
                </div>
                <p className="text-[12.5px] text-[#6D6A63]">
                  Sin postulaciones aún
                </p>
              </div>
            ) : (
              applicants.map((app, i) => {
                const initial = app.student.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={app.id}
                    className={`px-5 py-4 flex items-center gap-3 ${
                      i < applicants.length - 1
                        ? "border-b border-black/[0.04]"
                        : ""
                    }`}
                  >
                    {app.student.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.student.image}
                        alt={app.student.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-[0_2px_6px_-1px_rgba(20,15,10,0.12)] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-[0_2px_6px_-1px_rgba(255,106,61,0.4)]">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
                        {app.student.name}
                      </p>
                      <p className="text-[11.5px] text-[#6D6A63] truncate">
                        {app.student.email}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {applicants.length > 0 && (
            <div className="px-5 py-3 border-t border-black/[0.05]">
              <Link
                href={`/dashboard/empresa/candidatos/${selectedInternship}`}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.45)] px-3.5 py-2 rounded-xl transition-all"
              >
                Gestionar candidatos
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.4} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle práctica */}
      {detailInternship && (
        <div
          className="fixed inset-0 bg-[#0A0909]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDetailInternship(null)}
        >
          <div
            className="bg-white rounded-[24px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_24px_64px_-12px_rgba(20,15,10,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-black/[0.05]">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#FF6A3D] mb-1">
                  {detailInternship.area}
                </p>
                <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[#0A0909] leading-snug">
                  {detailInternship.title}
                </h2>
              </div>
              <button
                onClick={() => setDetailInternship(null)}
                className="w-8 h-8 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-[#6D6A63]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium bg-[#FAFAF8] text-[#4A4843] px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3" />
                  {detailInternship.location}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium bg-[#FAFAF8] text-[#4A4843] px-3 py-1.5 rounded-full">
                  <Layers className="w-3 h-3" />
                  {MODALITY_LABEL[detailInternship.modality]}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium bg-[#FAFAF8] text-[#4A4843] px-3 py-1.5 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {detailInternship.duration}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63]">
                    Descripción
                  </p>
                </div>
                <p className="text-[13px] text-[#4A4843] leading-[1.65] whitespace-pre-line">
                  {detailInternship.description}
                </p>
              </div>

              {detailInternship.skills?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      Skills
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailInternship.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[11.5px] font-medium bg-[#F4F3EF] text-[#4A4843] px-2.5 py-1 rounded-lg"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailInternship.requirements?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-0.5 h-4 bg-gradient-to-b from-[#FF6A3D] to-[#FF9B6A] rounded-full" />
                    <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6A63] flex items-center gap-1.5">
                      <ClipboardList className="w-3 h-3" />
                      Requisitos
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {detailInternship.requirements.map((r) => (
                      <li
                        key={r}
                        className="text-[13px] text-[#4A4843] flex items-start gap-2"
                      >
                        <span className="w-1 h-1 rounded-full bg-[#FF6A3D] mt-2 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11.5px] text-[#9B9891]">
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
                className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white font-semibold py-3 rounded-xl text-[13.5px] shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all"
              >
                <Users className="w-4 h-4" strokeWidth={2.3} />
                Ver postulantes
                <span className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear */}
      {showForm && (
        <div
          className="fixed inset-0 bg-[#0A0909]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowForm(false);
            setFormErrors({});
          }}
        >
          <div
            className="bg-white rounded-[24px] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_24px_64px_-12px_rgba(20,15,10,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.05] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#FF6A3D]">
                  Nueva práctica
                </p>
                <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0A0909] mt-0.5">
                  Publicá una vacante
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormErrors({});
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-[#6D6A63]" />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="px-6 py-5 space-y-4"
              noValidate
            >
              <div>
                <label className={LABEL_CLS}>Título *</label>
                <input
                  type="text"
                  placeholder="Ej: Pasantía Frontend Developer"
                  className={INPUT_CLS(!!formErrors.title)}
                  {...field("title")}
                />
                {formErrors.title && (
                  <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                    {formErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLS}>Descripción *</label>
                <textarea
                  rows={4}
                  placeholder="Describí las tareas y el contexto del puesto"
                  className={INPUT_CLS(!!formErrors.description)}
                  {...field("description")}
                />
                {formErrors.description && (
                  <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                    {formErrors.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Área</label>
                  <select className={INPUT_CLS()} {...field("area")}>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Modalidad</label>
                  <select className={INPUT_CLS()} {...field("modality")}>
                    {MODALITIES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Ubicación *</label>
                  <input
                    type="text"
                    placeholder="Ej: Santiago"
                    className={INPUT_CLS(!!formErrors.location)}
                    {...field("location")}
                  />
                  {formErrors.location && (
                    <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                      {formErrors.location}
                    </p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLS}>Duración *</label>
                  <input
                    type="text"
                    placeholder="3 meses"
                    className={INPUT_CLS(!!formErrors.duration)}
                    {...field("duration")}
                  />
                  {formErrors.duration && (
                    <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                      {formErrors.duration}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Skills requeridas *</label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Node.js"
                  className={INPUT_CLS(!!formErrors.skills)}
                  {...field("skills")}
                />
                <p className="text-[10.5px] text-[#9B9891] mt-1">
                  Separá con comas
                </p>
                {formErrors.skills && (
                  <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                    {formErrors.skills}
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL_CLS}>Requisitos *</label>
                <input
                  type="text"
                  placeholder="Estudiante Ing. Informática, 4to año+"
                  className={INPUT_CLS(!!formErrors.requirements)}
                  {...field("requirements")}
                />
                {formErrors.requirements && (
                  <p className="text-[11.5px] text-[#A63418] mt-1 font-medium">
                    {formErrors.requirements}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="group w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white font-semibold py-3 rounded-xl text-[13.5px] shadow-[0_8px_20px_-6px_rgba(255,106,61,0.5)] hover:shadow-[0_12px_28px_-8px_rgba(255,106,61,0.6)] hover:from-[#FF5A28] hover:to-[#FF8A52] transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Publicando…
                  </>
                ) : (
                  <>
                    Publicar práctica
                    <span className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-[#0A0909]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-[24px] max-w-sm w-full p-7 shadow-[0_24px_64px_-12px_rgba(20,15,10,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFCDCD] to-[#FF6B6B] mx-auto mb-4 shadow-[0_8px_20px_-6px_rgba(255,107,107,0.45)]">
              <Trash2 className="w-6 h-6 text-white" strokeWidth={2.2} />
            </div>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#0A0909] text-center">
              Eliminar práctica
            </h2>
            <p className="text-[13px] text-[#6D6A63] text-center mt-2 leading-[1.55]">
              ¿Seguro? Se borrarán también todas las postulaciones asociadas.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 text-[13px] font-semibold text-[#4A4843] bg-[#FAFAF8] hover:bg-black/[0.05] py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={processing === confirmDeleteId}
                className="flex-1 text-[13px] font-semibold bg-[#C2410C] hover:bg-[#A63418] text-white py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {processing === confirmDeleteId ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
