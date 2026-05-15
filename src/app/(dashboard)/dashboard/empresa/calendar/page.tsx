"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import InterviewFormModal from "@/components/chat/calendar/InterviewFormModal";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import MiniMonthCalendar from "@/components/dashboard/calendar/MiniMonthCalendar";
import WeekView from "@/components/dashboard/calendar/WeekView";
import DayView from "@/components/dashboard/calendar/DayView";
import AgendaView from "@/components/dashboard/calendar/AgendaView";
import UpcomingList from "@/components/dashboard/calendar/UpcomingList";
import EventDrawer from "@/components/dashboard/calendar/EventDrawer";
import { E } from "@/components/dashboard/palettes";
import {
  toLocalDateStr,
  getWeekDays,
  getWeekStart,
  shiftWeek,
  weekRangeLabel,
} from "@/components/dashboard/calendar/calendarHelpers";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type CalendarView = "week" | "day" | "agenda";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmpresaCalendarPage() {
  const today = new Date();

  // Mini-month navigation state (month displayed in sidebar)
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Currently selected date for Día view and event filtering
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalDateStr(today),
  );

  // Week navigation: track the Monday of the displayed week
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));

  // Calendar view mode
  const [view, setView] = useState<CalendarView>("week");

  // Filter by práctica
  const [filterInternshipId, setFilterInternshipId] = useState<string>("");

  // Data
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  // Drawer state
  const [activeInterview, setActiveInterview] = useState<Interview | null>(
    null,
  );

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadInterviews = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterInternshipId) params.set("internshipId", filterInternshipId);
    const res = await fetchWithRefresh(`/api/interviews?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInterviews(data ?? []);
    }
    setLoading(false);
  }, [filterInternshipId]);

  const loadInternships = useCallback(async () => {
    const res = await fetchWithRefresh("/api/company/internships");
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

  // ─── Derived state ──────────────────────────────────────────────────────────

  const weekDates = getWeekDays(weekStart); // ["YYYY-MM-DD" × 7]
  const weekLabel = weekRangeLabel(weekStart);
  const todayStr = toLocalDateStr(today);

  const interviewDates = new Set(
    interviews.map((iv) => toLocalDateStr(new Date(iv.scheduledAt))),
  );

  const weekInterviewCount = interviews.filter((iv) => {
    const dateStr = toLocalDateStr(new Date(iv.scheduledAt));
    return weekDates.includes(dateStr);
  }).length;

  const todayInterviewCount = interviews.filter(
    (iv) => toLocalDateStr(new Date(iv.scheduledAt)) === todayStr,
  ).length;

  // ─── Navigation handlers ────────────────────────────────────────────────────

  const handlePrevWeek = () => setWeekStart((ws) => shiftWeek(ws, -1));
  const handleNextWeek = () => setWeekStart((ws) => shiftWeek(ws, 1));
  const handleToday = () => {
    const t = new Date();
    setWeekStart(getWeekStart(t));
    setSelectedDate(toLocalDateStr(t));
    setYear(t.getFullYear());
    setMonth(t.getMonth());
  };

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

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    // Sync week to match the selected date
    setWeekStart(getWeekStart(new Date(dateStr + "T12:00:00")));
    // Switch to día view when clicking a day in the sidebar
    setView("day");
  };

  // ─── Interview action handlers ──────────────────────────────────────────────

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
      const res = await fetchWithRefresh(
        `/api/interviews/${editingInterview.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        const detail = err.issues
          ? ` (${err.issues.map((i: { path: string[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join(", ")})`
          : "";
        throw new Error((err.error ?? "Error al actualizar") + detail);
      }
    } else {
      const res = await fetchWithRefresh("/api/interviews", {
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
    const res = await fetchWithRefresh(
      `/api/interviews/${interviewId}/send-to-chat`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al enviar");
      return;
    }
    // Refresh active interview in drawer if open
    setActiveInterview((prev) =>
      prev?.id === interviewId ? { ...prev, sentToChat: true } : prev,
    );
    await loadInterviews();
  };

  const handleDelete = async (interviewId: string) => {
    const res = await fetchWithRefresh(`/api/interviews/${interviewId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error al eliminar");
      return;
    }
    if (activeInterview?.id === interviewId) setActiveInterview(null);
    await loadInterviews();
  };

  const handleEdit = (interviewId: string) => {
    const iv = interviews.find((i) => i.id === interviewId) ?? null;
    setEditingInterview(iv);
    setShowModal(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="h-[calc(100vh-64px)] flex flex-col overflow-hidden"
      style={{ background: E.bg }}
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm mb-3"
              style={{
                background: E.surface,
                border: `1px solid ${E.border}`,
              }}
            >
              <CalendarIcon
                className="w-3 h-3"
                style={{ color: E.accent }}
                strokeWidth={2.4}
              />
              <span
                className="text-[10.5px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: E.muted }}
              >
                Agenda de entrevistas
              </span>
            </div>
            <h1
              className="text-[32px] md:text-[38px] leading-[1.05] font-bold tracking-[-0.035em]"
              style={{ color: E.text }}
            >
              Tus{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${E.accentHi}, ${E.accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                entrevistas
              </span>
            </h1>
            <p className="text-[13px] mt-2" style={{ color: E.muted }}>
              {weekInterviewCount} entrevistas esta semana
              {todayInterviewCount > 0 && ` · ${todayInterviewCount} hoy`}
            </p>
          </div>

          <button
            onClick={() => {
              setEditingInterview(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-[13px] font-semibold rounded-xl flex-shrink-0 transition-all"
            style={{
              background: `linear-gradient(135deg, ${E.accent}, ${E.accentHi})`,
              boxShadow: `0 4px 12px -2px ${E.accentBdr}`,
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            Nueva entrevista
          </button>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div
            className="flex rounded-[10px] p-1"
            style={{ background: E.border }}
          >
            {(["week", "day", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                style={
                  view === v
                    ? {
                        background: E.surface,
                        color: E.text,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: E.muted }
                }
              >
                {v === "week" ? "Semana" : v === "day" ? "Día" : "Agenda"}
              </button>
            ))}
          </div>

          {/* Week navigation (only in week view) */}
          {view === "week" && (
            <div
              className="flex items-center gap-1 rounded-[10px] px-1 py-1"
              style={{
                background: E.surface,
                border: `1px solid ${E.border}`,
              }}
            >
              <button
                onClick={handlePrevWeek}
                className="w-7 h-7 inline-flex items-center justify-center rounded-lg transition-all"
                style={{ color: E.muted }}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <span
                className="text-[12.5px] font-bold px-2 min-w-[140px] text-center"
                style={{ color: E.text }}
              >
                {weekLabel}
              </span>
              <button
                onClick={handleNextWeek}
                className="w-7 h-7 inline-flex items-center justify-center rounded-lg transition-all"
                style={{ color: E.muted }}
                aria-label="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          )}

          <button
            onClick={handleToday}
            className="px-3.5 py-2 text-[12px] font-semibold rounded-[10px] transition-all"
            style={{
              background: E.surface,
              border: `1px solid ${E.border}`,
              color: E.text,
            }}
          >
            Hoy
          </button>

          {/* Filter by práctica */}
          <div className="relative inline-flex items-center ml-auto">
            <Filter
              className="w-3.5 h-3.5 absolute left-3 pointer-events-none"
              style={{ color: E.subtle }}
              strokeWidth={2.2}
            />
            <select
              id="calendar-filter-internship"
              name="internshipId"
              value={filterInternshipId}
              onChange={(e) => setFilterInternshipId(e.target.value)}
              aria-label="Filtrar entrevistas por práctica"
              className="appearance-none rounded-[10px] pl-8 pr-8 py-2 text-[12px] font-medium focus:outline-none transition-all cursor-pointer"
              style={{
                background: E.surface,
                border: `1px solid ${E.border}`,
                color: E.text,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
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
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 px-6 pb-6">
        {/* Calendar panel */}
        <div
          className="rounded-[20px] overflow-hidden flex flex-col min-h-0"
          style={{
            background: E.surface,
            border: `1px solid ${E.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{
                  borderColor: `${E.accentLo}`,
                  borderTopColor: E.accent,
                }}
              />
            </div>
          ) : (
            <>
              {view === "week" && (
                <WeekView
                  weekDates={weekDates}
                  interviews={interviews}
                  onSelectInterview={setActiveInterview}
                />
              )}
              {view === "day" && (
                <DayView
                  selectedDate={selectedDate}
                  interviews={interviews}
                  onSelectInterview={setActiveInterview}
                />
              )}
              {view === "agenda" && (
                <AgendaView
                  interviews={interviews}
                  onSelectInterview={setActiveInterview}
                />
              )}
            </>
          )}
        </div>

        {/* Right rail */}
        <aside className="hidden xl:flex flex-col gap-4 min-h-0">
          <MiniMonthCalendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            interviewDates={interviewDates}
            weekDates={weekDates}
            onSelectDate={handleSelectDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
          <UpcomingList
            interviews={interviews}
            onSelectInterview={setActiveInterview}
          />
        </aside>
      </div>

      {/* ── Event Drawer ── */}
      {activeInterview && (
        <EventDrawer
          interview={activeInterview}
          onClose={() => setActiveInterview(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSendToChat={handleSendToChat}
        />
      )}

      {/* ── Create/Edit Modal ── */}
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
