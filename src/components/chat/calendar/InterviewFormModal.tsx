"use client";

import { useEffect, useState } from "react";
import { X, Info, AlertTriangle } from "lucide-react";

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
  // Para edición, pasamos el interview actual
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

export default function InterviewFormModal({
  editingId,
  initialData,
  internships,
  onSubmit,
  onClose,
}: InterviewFormModalProps) {
  const isEditing = !!editingId;

  // Parsear fecha y hora del initialData si viene
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

  // Cargar candidatos cuando cambia la práctica
  useEffect(() => {
    if (!form.internshipId) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    fetch(`/api/interviews/available-candidates/${form.internshipId}`)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-gray-900">
            {isEditing ? "✏️ Editar entrevista" : "📅 Nueva entrevista"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Práctica */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Práctica *
            </label>
            <select
              value={form.internshipId}
              onChange={(e) => handleInternshipChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Seleccionar práctica laboral</option>
              {internships.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </div>

          {/* Candidato */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Candidato *
            </label>
            <select
              value={form.applicationId}
              onChange={(e) => handleCandidateChange(e.target.value)}
              disabled={!form.internshipId || loadingCandidates}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
            >
              <option value="">
                {loadingCandidates
                  ? "Cargando candidatos..."
                  : !form.internshipId
                    ? "Seleccioná una práctica primero"
                    : "Seleccionar candidato"}
              </option>
              {/* Si editando, incluir el candidato actual aunque no esté en la lista de disponibles */}
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
                <p className="text-xs text-gray-400 mt-1">
                  No hay candidatos en etapa INTERVIEW sin entrevista activa.
                </p>
              )}

            {/* Advertencia cambio de candidato cuando ya fue enviado */}
            {candidateSentToChat && candidateChanged && (
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Al cambiar el candidato se notificará al candidato anterior
                  que la entrevista fue reasignada.
                </p>
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ej: Entrevista técnica - Frontend Dev"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Hora *
              </label>
              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Duración
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, durationMins: mins }))
                  }
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    form.durationMins === mins
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Link de reunión{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, meetingLink: e.target.value }))
              }
              placeholder="zoom.us/j/... o meet.google.com/..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <p className="text-xs text-gray-400 mt-1">
              Podés usar Zoom, Meet, Teams o cualquier plataforma.
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Notas{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Ej: Por favor traé tu portafolio..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          {/* Aviso envío manual */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              La cita <strong>no se enviará al candidato</strong> hasta que
              presionés <em>&quot;Enviar al chat&quot;</em> desde el calendario.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Guardar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
