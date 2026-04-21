"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Calendar as CalendarIcon, Filter } from "lucide-react";
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

type Internship = { id: string; title: string; isActive: boolean };

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInternships();
  }, [loadInternships]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const monthCount = interviews.filter((iv) => {
    const d = new Date(iv.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8 md:py-10">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-black/[0.06] mb-4">
            <CalendarIcon
              className="w-3 h-3 text-[#FF6A3D]"
              strokeWidth={2.4}
            />
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#4A4843]">
              Agenda de entrevistas
            </span>
          </div>
          <h1 className="text-[38px] md:text-[46px] leading-[1.05] font-bold tracking-[-0.035em] text-[#0A0909]">
            Tus{" "}
            <span className="bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent">
              entrevistas
            </span>
          </h1>
          <p className="text-[14.5px] text-[#6D6A63] mt-3 max-w-xl leading-relaxed">
            Agendá reuniones con tus candidatos y enviá la cita directo al chat
            con un click.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingInterview(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] text-white text-[13px] font-semibold rounded-xl hover:shadow-[0_8px_24px_-6px_rgba(255,106,61,0.5)] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.35)] transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.4} />
          Nueva entrevista
        </button>
      </div>

      {/* Filtro por oferta */}
      <div className="mb-6">
        <div className="relative inline-flex items-center">
          <Filter
            className="w-3.5 h-3.5 text-[#9B9891] absolute left-3.5 pointer-events-none"
            strokeWidth={2.2}
          />
          <select
            value={filterInternshipId}
            onChange={(e) => setFilterInternshipId(e.target.value)}
            className="appearance-none rounded-xl border border-black/[0.08] bg-white pl-9 pr-9 py-2.5 text-[13px] font-medium text-[#0A0909] focus:outline-none focus:border-[#FF6A3D]/40 focus:ring-2 focus:ring-[#FF6A3D]/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
          >
            <option value="">Todas las prácticas</option>
            {internships.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Columna izquierda */}
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
          <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-5 py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891]">
              {MONTHS_ES[month]} {year}
            </p>
            <p className="text-[32px] font-bold tracking-[-0.025em] text-[#0A0909] mt-1.5 leading-none">
              {monthCount}
            </p>
            <p className="text-[12px] text-[#6D6A63] mt-1.5">
              entrevista{monthCount !== 1 ? "s" : ""} este mes
            </p>
          </div>
        </div>

        {/* Lista de entrevistas */}
        <div>
          <h2 className="text-[11px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] mb-4">
            {dayLabel}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-7 h-7 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
            </div>
          ) : dayInterviews.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-dashed border-black/[0.08] py-14 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FAFAF8] border border-black/[0.05] flex items-center justify-center mx-auto mb-3">
                <CalendarIcon
                  className="w-5 h-5 text-[#C9C6BF]"
                  strokeWidth={1.8}
                />
              </div>
              <p className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                {selectedDate ? "Día libre" : "Sin entrevistas agendadas"}
              </p>
              <p className="text-[12px] text-[#9B9891] mt-1">
                {selectedDate
                  ? "No tenés entrevistas para este día."
                  : "Creá una nueva entrevista para arrancar."}
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
          internships={internships.filter((i) => i.isActive)}
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
