"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Info,
  AlertTriangle,
  CalendarDays,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

type Internship = {
  id: string;
  title: string;
};

type Candidate = {
  applicationId: string;
  conversationId: string | null;
  student: {
    id: string;
    name: string;
    image: string | null;
  };
};

type InterviewFormData = {
  internshipId: string;
  applicationId: string;
  conversationId: string;
  title: string;
  date: string;
  time: string;
  durationMins: number;
  meetingLink: string;
  notes: string;
};

type InterviewFormModalProps = {
  editingId?: string;
  initialData?: {
    internshipId: string;
    applicationId: string;
    conversationId: string;
    title: string;
    scheduledAt: string;
    durationMins: number;
    meetingLink: string | null;
    notes: string | null;
    sentToChat: boolean;
  };
  internships: Internship[];
  onSubmit: (data: InterviewFormData) => Promise<void>;
  onClose: () => void;
};

const DURATION_OPTIONS = [30, 60, 90, 120];

const fieldClass =
  "w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13px] text-[#0A0909] placeholder:text-[#9B9891] focus:outline-none focus:border-[#FF6A3D]/40 focus:ring-2 focus:ring-[#FF6A3D]/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const labelClass =
  "block text-[10.5px] font-semibold text-[#4A4843] uppercase tracking-[0.08em] mb-2";

export default function InterviewFormModal({
  editingId,
  initialData,
  internships,
  onSubmit,
  onClose,
}: InterviewFormModalProps) {
  const isEditing = !!editingId;

  const initDate = initialData?.scheduledAt
    ? new Date(initialData.scheduledAt).toISOString().slice(0, 10)
    : "";
  const initTime = initialData?.scheduledAt
    ? new Date(initialData.scheduledAt).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const [form, setForm] = useState<InterviewFormData>({
    internshipId: initialData?.internshipId ?? "",
    applicationId: initialData?.applicationId ?? "",
    conversationId: initialData?.conversationId ?? "",
    title: initialData?.title ?? "",
    date: initDate,
    time: initTime,
    durationMins: initialData?.durationMins ?? 60,
    meetingLink: initialData?.meetingLink ?? "",
    notes: initialData?.notes ?? "",
  });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.internshipId) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    fetchWithRefresh(
      `/api/interviews/available-candidates/${form.internshipId}`,
    )
      .then((r) => r.json())
      .then((data) => setCandidates(data ?? []))
      .catch(console.error)
      .finally(() => setLoadingCandidates(false));
  }, [form.internshipId]);

  const handleInternshipChange = (internshipId: string) => {
    setForm((prev) => ({
      ...prev,
      internshipId,
      applicationId: "",
      conversationId: "",
    }));
  };

  const handleCandidateChange = (applicationId: string) => {
    const candidate = candidates.find((c) => c.applicationId === applicationId);
    setForm((prev) => ({
      ...prev,
      applicationId,
      conversationId: candidate?.conversationId ?? "",
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.internshipId) {
      setError("Seleccioná una práctica");
      return;
    }
    if (!form.applicationId) {
      setError("Seleccioná un candidato");
      return;
    }
    if (!form.conversationId) {
      setError(
        "El candidato no tiene una conversación activa. Iniciá el chat primero.",
      );
      return;
    }
    if (!form.title.trim()) {
      setError("El título es requerido");
      return;
    }
    if (!form.date || !form.time) {
      setError("Fecha y hora son requeridas");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCandidate = candidates.find(
    (c) => c.applicationId === form.applicationId,
  );
  const candidateSentToChat = isEditing && initialData?.sentToChat;
  const candidateChanged =
    isEditing && form.applicationId !== initialData?.applicationId;

  const HeaderIcon = isEditing ? Pencil : CalendarDays;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <div
        className="absolute inset-0 bg-[#0A0909]/50 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-[24px] shadow-[0_32px_64px_-16px_rgba(20,15,10,0.3)] border border-black/[0.06] w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center shadow-[0_4px_12px_-3px_rgba(255,106,61,0.45)]">
              <HeaderIcon className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0A0909] tracking-[-0.02em] leading-none">
                {isEditing ? "Editar entrevista" : "Nueva entrevista"}
              </h2>
              <p className="text-[11px] text-[#9B9891] mt-1">
                {isEditing
                  ? "Actualizá los datos y guardá"
                  : "Completá los campos para agendar"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#9B9891] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Práctica */}
          <div>
            <label className={labelClass}>Práctica *</label>
            <select
              value={form.internshipId}
              onChange={(e) => handleInternshipChange(e.target.value)}
              className={`${fieldClass} cursor-pointer appearance-none`}
            >
              <option value="">Seleccionar práctica laboral</option>
              {isEditing &&
                initialData?.internshipId &&
                !internships.some((i) => i.id === initialData.internshipId) && (
                  <option value={initialData.internshipId}>
                    (Práctica inactiva)
                  </option>
                )}
              {internships.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </div>

          {/* Candidato */}
          <div>
            <label className={labelClass}>Candidato *</label>
            <select
              value={form.applicationId}
              onChange={(e) => handleCandidateChange(e.target.value)}
              disabled={!form.internshipId || loadingCandidates}
              className={`${fieldClass} cursor-pointer appearance-none`}
            >
              <option value="">
                {loadingCandidates
                  ? "Cargando candidatos..."
                  : !form.internshipId
                    ? "Seleccioná una práctica primero"
                    : "Seleccionar candidato"}
              </option>
              {isEditing &&
                initialData?.applicationId === form.applicationId &&
                !candidates.some(
                  (c) => c.applicationId === form.applicationId,
                ) && (
                  <option value={form.applicationId}>
                    {selectedCandidate?.student.name ?? "(Candidato actual)"}
                  </option>
                )}
              {candidates.map((c) => (
                <option key={c.applicationId} value={c.applicationId}>
                  {c.student.name}
                  {!c.conversationId ? " (sin chat activo)" : ""}
                </option>
              ))}
            </select>
            {form.internshipId &&
              !loadingCandidates &&
              candidates.length === 0 && (
                <p className="text-[11.5px] text-[#9B9891] mt-1.5">
                  No hay candidatos en etapa INTERVIEW sin entrevista activa.
                </p>
              )}

            {candidateSentToChat && candidateChanged && (
              <div className="flex items-start gap-2 mt-2.5 p-3 bg-[#FFF7EC] border border-[#FCD9A8] rounded-xl">
                <AlertTriangle
                  className="w-3.5 h-3.5 text-[#B45309] flex-shrink-0 mt-0.5"
                  strokeWidth={2.2}
                />
                <p className="text-[11.5px] text-[#B45309] leading-relaxed">
                  Al cambiar el candidato se notificará al candidato anterior
                  que la entrevista fue reasignada.
                </p>
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <label className={labelClass}>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ej: Entrevista técnica — Frontend Dev"
              className={fieldClass}
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Hora *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, time: e.target.value }))
                }
                className={fieldClass}
              />
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className={labelClass}>Duración</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((mins) => {
                const active = form.durationMins === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, durationMins: mins }))
                    }
                    className={`flex-1 py-2 rounded-xl text-[12.5px] font-semibold transition-all ${
                      active
                        ? "bg-[#0A0909] text-white shadow-[0_2px_6px_-1px_rgba(20,15,10,0.25)]"
                        : "bg-[#F5F4F1] text-[#6D6A63] hover:bg-black/[0.06] hover:text-[#0A0909]"
                    }`}
                  >
                    {mins} min
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link */}
          <div>
            <label className={labelClass}>
              Link de reunión{" "}
              <span className="font-medium text-[#9B9891] normal-case tracking-normal">
                (opcional)
              </span>
            </label>
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, meetingLink: e.target.value }))
              }
              placeholder="zoom.us/j/... o meet.google.com/..."
              className={fieldClass}
            />
            <p className="text-[11px] text-[#9B9891] mt-1.5">
              Podés usar Zoom, Meet, Teams o cualquier plataforma.
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className={labelClass}>
              Notas{" "}
              <span className="font-medium text-[#9B9891] normal-case tracking-normal">
                (opcional)
              </span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Ej: Por favor traé tu portafolio..."
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </div>

          {/* Aviso envío manual */}
          <div className="flex items-start gap-2.5 p-3 bg-[#FFF7F2] border border-[#FFD6B8] rounded-xl">
            <Info
              className="w-4 h-4 text-[#FF6A3D] flex-shrink-0 mt-0.5"
              strokeWidth={2.2}
            />
            <p className="text-[11.5px] text-[#7A3B1F] leading-relaxed">
              La cita{" "}
              <strong className="font-semibold">
                no se enviará al candidato
              </strong>{" "}
              hasta que presionés{" "}
              <em className="not-italic font-semibold">
                &ldquo;Enviar al chat&rdquo;
              </em>{" "}
              desde el calendario.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
              <AlertTriangle
                className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5"
                strokeWidth={2.2}
              />
              <p className="text-[12px] text-[#B91C1C] leading-relaxed">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl px-6 py-4 border-t border-black/[0.05] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[13px] font-semibold text-[#4A4843] border border-black/[0.08] bg-white hover:bg-black/[0.03] hover:text-[#0A0909] rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] hover:shadow-[0_8px_24px_-6px_rgba(255,106,61,0.5)] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.35)] rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Guardar
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.4} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
