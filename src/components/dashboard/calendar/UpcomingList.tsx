"use client";

import {
  toLocalDateStr,
  DAYS_ES_SHORT,
  isInterviewPast,
} from "./calendarHelpers";
import { E } from "@/components/dashboard/palettes";

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
  interviews: Interview[];
  onSelectInterview: (iv: Interview) => void;
};

export default function UpcomingList({ interviews, onSelectInterview }: Props) {
  const now = new Date();
  const todayStr = toLocalDateStr(now);

  const upcoming = interviews
    .filter((iv) => new Date(iv.scheduledAt) >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )
    .slice(0, 8);

  return (
    <div
      className="rounded-[16px] p-4 flex flex-col flex-1 min-h-0"
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <h3
        className="text-[12.5px] font-bold tracking-[-0.01em] mb-3 flex-shrink-0"
        style={{ color: E.text }}
      >
        Próximas
      </h3>
      {upcoming.length === 0 ? (
        <p className="text-[11.5px] py-2" style={{ color: E.subtle }}>
          Sin entrevistas próximas.
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 -mr-1 pr-1">
          {upcoming.map((iv) => {
            const d = new Date(iv.scheduledAt);
            const dateStr = toLocalDateStr(d);
            const isToday = dateStr === todayStr;
            const dowIndex = (d.getDay() + 6) % 7;
            const dayName = isToday ? "Hoy" : DAYS_ES_SHORT[dowIndex];
            const dayNum = d.getDate();
            const startLabel = new Intl.DateTimeFormat("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(d);

            const past = isInterviewPast(iv.scheduledAt, iv.durationMins);
            const borderColor = past ? E.subtle : E.green;
            const bgColor = past ? "rgba(15,23,42,0.05)" : E.greenBg;

            return (
              <button
                key={iv.id}
                onClick={() => onSelectInterview(iv)}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-left transition-all cursor-pointer"
                style={{
                  borderLeft: `3px solid ${borderColor}`,
                  background: bgColor,
                }}
              >
                {/* Date */}
                <div className="min-w-[44px]">
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.05em] leading-none"
                    style={{ color: E.subtle }}
                  >
                    {dayName}
                    {!isToday && ` ${dayNum}`}
                  </p>
                  <p
                    className="text-[11px] font-bold mt-0.5"
                    style={{ color: E.text }}
                  >
                    {startLabel}
                  </p>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11.5px] font-bold truncate leading-tight"
                    style={{ color: E.text }}
                  >
                    {iv.title}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 truncate"
                    style={{ color: E.muted }}
                  >
                    {iv.student.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
