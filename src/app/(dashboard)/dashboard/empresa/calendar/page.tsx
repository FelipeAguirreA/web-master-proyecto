"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import CalendarGrid from "@/components/chat/calendar/CalendarGrid";
import InterviewListItem from "@/components/chat/calendar/InterviewListItem";
import InterviewFormModal from "@/components/chat/calendar/InterviewFormModal";

type Interview = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  meetingLink: string | null;
  notes: string | null;
  sentToChat: boolean;
  sentToChatAt: string | null;
  internshipId: string;
  applicationId: string;
  studentId: string;
  conversationId: string;
  student: { id: string; name: string; image: string | null };
  internship: { id: string; title: string };
};

type Internship = { id: string; title: string };

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

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function EmpresaCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateStr(today),
  );
  const [filterInternshipId, setFilterInternshipId] = useState<string>("");

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  const loadInterviews = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterInternshipId) params.set("internshipId", filterInternshipId);

    const res = await fetch(`/api/interviews?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInterviews(data ?? []);
    }
    setLoading(false);
  }, [filterInternshipId]);

  const loadInternships = useCallback(async () => {
    const res = await fetch("/api/company/internships");
    if (res.ok) {
      const data = await res.json();
      setInternships(data.internships ?? []);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    void loadInternships();
  }, [loadInternships]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    void loadInterviews();
  }, [loadInterviews]);

  // Días con entrevistas para el grid
  const interviewDates = new Set(
    interviews.map((iv) => toLocalDateStr(new Date(iv.scheduledAt))),
  );

  // Entrevistas del día seleccionado
  const dayInterviews = selectedDate
    ? interviews.filter(
        (iv) => toLocalDateStr(new Date(iv.scheduledAt)) === selectedDate,
      )
    : interviews;

  const dayLabel = selectedDate
    ? new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
        .format(new Date(selectedDate + "T12:00:00"))
        .replace(/^\w/, (c) => c.toUpperCase())
    : "Todas las entrevistas";

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSubmitInterview = async (data: InterviewFormData) => {
    const scheduledAt = new Date(`${data.date}T${data.time}:00`).toISOString();
    const body = {
      internshipId: data.internshipId,
      applicationId: data.applicationId,
      conversationId: data.conversationId,
      title: data.title,
      scheduledAt,
      durationMins: data.durationMins,
      meetingLink: data.meetingLink || undefined,
      notes: data.notes || undefined,
    };

    if (editingInterview) {
      const res = await fetch(`/api/interviews/${editingInterview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        const detail = err.issues
          ? ` (${err.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")})`
          : "";
        throw new Error((err.error ?? "Error al actualizar") + detail);
      }
    } else {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        const detail = err.issues
          ? ` (${err.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")})`
          : "";
        throw new Error((err.error ?? "Error al crear") + detail);
      }
    }

    setShowModal(false);
    setEditingInterview(null);
    await loadInterviews();
  };

  const handleSendToChat = async (interviewId: string) => {
    const res = await fetch(`/api/interviews/${interviewId}/send-to-chat`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al enviar");
      return;
    }
    await loadInterviews();
  };

  const handleDelete = async (interviewId: string) => {
    const res = await fetch(`/api/interviews/${interviewId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al eliminar");
      return;
    }
    await loadInterviews();
  };

  const handleEdit = (interviewId: string) => {
    const iv = interviews.find((i) => i.id === interviewId) ?? null;
    setEditingInterview(iv);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900">
              📆 Entrevistas
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Agendá entrevistas y enviá las citas a los candidatos.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingInterview(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            Nueva entrevista
          </button>
        </div>

        {/* Filtro por oferta */}
        <div className="mb-6">
          <select
            value={filterInternshipId}
            onChange={(e) => setFilterInternshipId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-sm"
          >
            <option value="">Todas las prácticas</option>
            {internships.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Calendario */}
          <div className="space-y-4">
            <CalendarGrid
              year={year}
              month={month}
              interviewDates={interviewDates}
              selectedDate={selectedDate}
              onSelectDate={(d) => setSelectedDate(d)}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            {/* Resumen del mes */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {MONTHS_ES[month]} {year}
              </p>
              <p className="text-2xl font-extrabold text-gray-900">
                {
                  interviews.filter((iv) => {
                    const d = new Date(iv.scheduledAt);
                    return d.getFullYear() === year && d.getMonth() === month;
                  }).length
                }
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                entrevistas este mes
              </p>
            </div>
          </div>

          {/* Lista de entrevistas */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              {dayLabel}
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-7 h-7 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dayInterviews.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                <p className="text-sm text-gray-400">
                  {selectedDate
                    ? "No hay entrevistas para este día."
                    : "No hay entrevistas agendadas aún."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayInterviews.map((iv) => (
                  <InterviewListItem
                    key={iv.id}
                    id={iv.id}
                    title={iv.title}
                    scheduledAt={iv.scheduledAt}
                    durationMins={iv.durationMins}
                    meetingLink={iv.meetingLink}
                    notes={iv.notes}
                    sentToChat={iv.sentToChat}
                    sentToChatAt={iv.sentToChatAt}
                    studentName={iv.student.name}
                    internshipTitle={iv.internship.title}
                    onSendToChat={handleSendToChat}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <InterviewFormModal
          editingId={editingInterview?.id}
          initialData={
            editingInterview
              ? {
                  internshipId: editingInterview.internshipId,
                  applicationId: editingInterview.applicationId,
                  conversationId: editingInterview.conversationId,
                  title: editingInterview.title,
                  scheduledAt: editingInterview.scheduledAt,
                  durationMins: editingInterview.durationMins,
                  meetingLink: editingInterview.meetingLink,
                  notes: editingInterview.notes,
                  sentToChat: editingInterview.sentToChat,
                }
              : undefined
          }
          internships={internships}
          onSubmit={handleSubmitInterview}
          onClose={() => {
            setShowModal(false);
            setEditingInterview(null);
          }}
        />
      )}
    </div>
  );
}
