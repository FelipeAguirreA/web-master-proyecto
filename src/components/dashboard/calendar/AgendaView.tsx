"use client";

import {
  toLocalDateStr,
  MONTHS_ES,
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
  interviews: Interview[]; // all interviews, sorted by date
  onSelectInterview: (iv: Interview) => void;
};

function StudentAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `linear-gradient(135deg, ${E.accentHi}, ${E.accent})`,
      }}
    >
      {initials}
    </div>
  );
}

type GroupedDay = {
  dateStr: string;
  interviews: Interview[];
};

export default function AgendaView({ interviews, onSelectInterview }: Props) {
  const todayStr = toLocalDateStr(new Date());

  // Group by date
  const grouped: GroupedDay[] = [];
  const byDate = new Map<string, Interview[]>();
  for (const iv of interviews) {
    const dateStr = toLocalDateStr(new Date(iv.scheduledAt));
    if (!byDate.has(dateStr)) byDate.set(dateStr, []);
    byDate.get(dateStr)!.push(iv);
  }
  for (const [dateStr, ivs] of byDate) {
    grouped.push({
      dateStr,
      interviews: ivs.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      ),
    });
  }
  grouped.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  if (grouped.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-[13px]" style={{ color: E.subtle }}>
          Sin entrevistas agendadas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
      {grouped.map(({ dateStr, interviews: dayIvs }) => {
        const d = new Date(dateStr + "T12:00:00");
        const dayNum = d.getDate();
        const month = MONTHS_ES[d.getMonth()];
        // 0=Sun→6, 1=Mon→0
        const dowIndex = (d.getDay() + 6) % 7;
        const dayName = DAYS_ES_SHORT[dowIndex];
        const isToday = dateStr === todayStr;

        return (
          <div key={dateStr}>
            {/* Day header */}
            <div className="flex items-baseline gap-2.5 mb-3">
              <h3
                className="text-[13.5px] font-bold tracking-[-0.01em]"
                style={{ color: isToday ? E.accent : E.text }}
              >
                {dayName} {dayNum} de {month.toLowerCase()}
              </h3>
              {isToday && (
                <span
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.05em]"
                  style={{
                    color: E.accent,
                    background: E.accentBg,
                    border: `1px solid ${E.accentBdr}`,
                  }}
                >
                  Hoy
                </span>
              )}
              <span
                className="text-[11px] font-medium"
                style={{ color: E.subtle }}
              >
                {dayIvs.length}{" "}
                {dayIvs.length === 1 ? "entrevista" : "entrevistas"}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-2">
              {dayIvs.map((iv) => {
                const start = new Date(iv.scheduledAt);
                const startLabel = new Intl.DateTimeFormat("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(start);
                const endDate = new Date(
                  start.getTime() + iv.durationMins * 60_000,
                );
                const endLabel = new Intl.DateTimeFormat("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(endDate);

                const past = isInterviewPast(iv.scheduledAt, iv.durationMins);
                const borderColor = past ? E.subtle : E.green;
                const startTimeColor = past ? E.muted : E.text;

                return (
                  <button
                    key={iv.id}
                    onClick={() => onSelectInterview(iv)}
                    className="w-full flex items-center gap-3 p-3 rounded-[12px] text-left transition-all cursor-pointer"
                    style={{
                      borderLeft: `3px solid ${borderColor}`,
                      background: past ? "rgba(15,23,42,0.05)" : E.greenBg,
                    }}
                  >
                    {/* Time */}
                    <div className="min-w-[72px]">
                      <p
                        className="text-[12px] font-bold leading-none"
                        style={{ color: startTimeColor }}
                      >
                        {startLabel}
                      </p>
                      <p
                        className="text-[10.5px] font-medium mt-0.5"
                        style={{ color: E.subtle }}
                      >
                        {endLabel}
                      </p>
                    </div>

                    <StudentAvatar name={iv.student.name} size={30} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12.5px] font-bold truncate leading-tight"
                        style={{ color: E.text }}
                      >
                        {iv.title}
                      </p>
                      <p
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: E.muted }}
                      >
                        {iv.student.name}
                        <span className="mx-1" style={{ color: E.faint }}>
                          ·
                        </span>
                        {iv.internship.title}
                      </p>
                    </div>

                    {/* Badge */}
                    {iv.meetingLink && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          color: E.accent,
                          background: E.accentBg,
                          border: `1px solid ${E.accentBdr}`,
                        }}
                      >
                        Online
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
