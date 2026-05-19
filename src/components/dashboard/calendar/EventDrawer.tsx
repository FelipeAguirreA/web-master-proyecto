"use client";

import { createPortal } from "react-dom";
import { X, Video, MapPin, Link as LinkIcon, Send } from "lucide-react";
import { MONTHS_ES, isInterviewPast } from "./calendarHelpers";

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

type Props = {
  interview: Interview;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onSendToChat: (id: string) => Promise<void>;
};

function StudentAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br from-accent-hi to-accent"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function EventDrawer({
  interview,
  onClose,
  onEdit,
  onDelete,
  onSendToChat,
}: Props) {
  if (typeof document === "undefined") return null;

  const d = new Date(interview.scheduledAt);
  const month = MONTHS_ES[d.getMonth()];
  const dayNum = d.getDate();
  const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" }).format(
    d,
  );
  const startTime = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  const endDate = new Date(d.getTime() + interview.durationMins * 60 * 1000);
  const endTime = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(endDate);

  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const isOnline = interview.meetingLink !== null;
  const past = isInterviewPast(interview.scheduledAt, interview.durationMins);

  const handleDelete = async () => {
    if (
      !confirm("¿Eliminar esta entrevista? Esta acción no se puede deshacer.")
    )
      return;
    await onDelete(interview.id);
    onClose();
  };

  const handleSendToChat = async () => {
    await onSendToChat(interview.id);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm z-[60] bg-dark/40"
        onClick={onClose}
      />

      {/* Drawer — bottom sheet on mobile, right panel on sm+ */}
      <aside
        className={[
          "fixed z-[61] flex flex-col bg-surface shadow-[-20px_0_60px_rgba(15,23,42,0.12)]",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-[24px] max-h-[calc(100dvh-80px)]",
          // sm+: right-side panel
          "sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:rounded-none sm:rounded-l-[0px] sm:w-[min(440px,95vw)] sm:max-h-none",
        ].join(" ")}
      >
        {/* Header */}
        <div
          className={[
            "px-4 sm:px-6 py-4 sm:py-5 flex flex-col border-b border-border",
            past ? "bg-dark/5" : "bg-green-bg",
          ].join(" ")}
        >
          {/* Mobile drag handle */}
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-3 sm:hidden" />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div
              className={[
                "inline-flex items-center gap-2 px-2.5 py-1 rounded-full",
                past
                  ? "bg-subtle/10 border border-subtle/20"
                  : "bg-green-bg border border-green/20",
              ].join(" ")}
            >
              <span
                className={[
                  "w-1.5 h-1.5 rounded-full",
                  past ? "bg-subtle" : "bg-green",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[10.5px] font-bold uppercase tracking-[0.06em]",
                  past ? "text-subtle" : "text-green",
                ].join(" ")}
              >
                {past ? "Finalizada" : "Entrevista"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-xl inline-flex items-center justify-center transition-all flex-shrink-0 bg-border text-muted hover:text-text"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
          <h2 className="text-[17px] sm:text-[18px] font-bold tracking-[-0.03em] leading-tight text-text">
            {interview.title}
          </h2>
          <p className="text-[12.5px] mt-2 text-muted">
            {weekdayCap} {dayNum} de {month.toLowerCase()} · {startTime} –{" "}
            {endTime}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Postulante */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] mb-2.5 text-subtle">
              Postulante
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-bg border border-border">
              <StudentAvatar name={interview.student.name} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold truncate text-text">
                  {interview.student.name}
                </p>
                <p className="text-[11.5px] mt-0.5 truncate text-muted">
                  {interview.internship.title}
                </p>
              </div>
            </div>
          </div>

          {/* Modalidad */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] mb-2.5 text-subtle">
              Modalidad
            </p>
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-bg border border-border">
              {isOnline ? (
                <Video
                  className="w-4 h-4 flex-shrink-0 text-subtle"
                  strokeWidth={2}
                />
              ) : (
                <MapPin
                  className="w-4 h-4 flex-shrink-0 text-subtle"
                  strokeWidth={2}
                />
              )}
              <span className="text-[12.5px] font-medium flex-1 text-text">
                {isOnline ? "Online" : "Presencial"}
              </span>
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-[11.5px] font-bold rounded-lg transition-colors bg-accent hover:bg-accent-hi"
                >
                  <Video className="w-3 h-3" strokeWidth={2.4} />
                  Unirme
                </a>
              )}
            </div>
            {interview.meetingLink && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <LinkIcon
                  className="w-3 h-3 flex-shrink-0 text-subtle"
                  strokeWidth={2.2}
                />
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] hover:underline truncate font-medium text-accent"
                >
                  {interview.meetingLink}
                </a>
              </div>
            )}
          </div>

          {/* Notas */}
          {interview.notes && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] mb-2.5 text-subtle">
                Notas
              </p>
              <p className="text-[12.5px] leading-relaxed p-3 rounded-[14px] text-muted bg-bg border border-border">
                {interview.notes}
              </p>
            </div>
          )}

          {/* Estado chat */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] mb-2.5 text-subtle">
              Estado
            </p>
            {interview.sentToChat ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-green-bg border border-green/20 text-green">
                <span className="w-1.5 h-1.5 rounded-full bg-green" />
                Enviada al candidato
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-bg border border-amber/20 text-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                Sin enviar al candidato
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 flex gap-2 sm:gap-2.5 border-t border-border">
          {/* Send to chat */}
          <button
            onClick={handleSendToChat}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-white text-[12.5px] font-bold rounded-xl transition-all bg-gradient-to-br from-accent to-accent-hi shadow-[0_4px_12px_-2px_var(--color-accent-bdr)]"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2.4} />
            {interview.sentToChat ? "Reenviar al chat" : "Enviar al chat"}
          </button>

          {/* Reschedule */}
          <button
            onClick={() => {
              onEdit(interview.id);
              onClose();
            }}
            className="px-3 sm:px-4 py-2.5 text-[12.5px] font-semibold rounded-xl transition-all bg-surface border border-border text-muted hover:text-text"
          >
            Reagendar
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="px-3 sm:px-4 py-2.5 text-[12.5px] font-semibold rounded-xl transition-all bg-surface border border-border text-rose hover:bg-rose-bg"
          >
            Cancelar
          </button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
