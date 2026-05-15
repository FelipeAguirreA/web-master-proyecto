"use client";

import { useEffect, useRef, useState } from "react";
import {
  toLocalDateStr,
  nowMinutes,
  MONTHS_ES,
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
  selectedDate: string; // "YYYY-MM-DD"
  interviews: Interview[];
  onSelectInterview: (iv: Interview) => void;
};

const HOURS = [
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
];
const START_MIN = 0;
const END_MIN = 24 * 60; // 1440
const PX_PER_MIN = 0.85;
const CELL_H = 60 * PX_PER_MIN;
const TOTAL_H = (END_MIN - START_MIN) * PX_PER_MIN; // 1224px

function StudentAvatar({ name, size = 36 }: { name: string; size?: number }) {
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

export default function DayView({
  selectedDate,
  interviews,
  onSelectInterview,
}: Props) {
  const todayStr = toLocalDateStr(new Date());
  const isToday = selectedDate === todayStr;
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentNow, setCurrentNow] = useState(nowMinutes());

  useEffect(() => {
    const interval = setInterval(() => setCurrentNow(nowMinutes()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const d = new Date(selectedDate + "T12:00:00");
  const dayNum = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" }).format(
    d,
  );
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  const dayIvs = interviews
    .filter((iv) => toLocalDateStr(new Date(iv.scheduledAt)) === selectedDate)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );

  // Scroll to earliest interview of the day, or 07:00 if none
  useEffect(() => {
    if (!containerRef.current) return;
    let targetMin = 7 * 60; // default: 07:00
    if (dayIvs.length > 0) {
      const start = new Date(dayIvs[0].scheduledAt);
      const earliest = start.getHours() * 60 + start.getMinutes();
      targetMin = Math.max(0, earliest - 30);
    }
    containerRef.current.scrollTop = targetMin * PX_PER_MIN;
  }, [selectedDate, dayIvs]);

  const nowInRange = isToday && currentNow >= START_MIN && currentNow < END_MIN;

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div
        className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${E.border}` }}
      >
        <div
          className="inline-flex items-center justify-center w-11 h-11 rounded-[12px] text-[17px] font-bold"
          style={
            isToday
              ? {
                  background: E.accent,
                  color: "#fff",
                  boxShadow: `0 6px 16px -4px ${E.accentBdr}`,
                }
              : { background: E.bg, color: E.text }
          }
        >
          {dayNum}
        </div>
        <div>
          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.07em]"
            style={{ color: isToday ? E.accent : E.subtle }}
          >
            {isToday ? "Hoy" : weekdayCap}
          </p>
          <p
            className="text-[14.5px] font-bold tracking-[-0.02em]"
            style={{ color: E.text }}
          >
            {isToday
              ? `${weekdayCap} ${dayNum} de ${month.toLowerCase()}`
              : `${dayNum} de ${month.toLowerCase()}`}
          </p>
        </div>
        <div
          className="ml-auto text-[12px] font-medium"
          style={{ color: E.subtle }}
        >
          {dayIvs.length} {dayIvs.length === 1 ? "entrevista" : "entrevistas"}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* paddingTop gives the 00:00 label room so it isn't clipped by the
            top edge of the scroll container. */}
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: "72px 1fr",
            height: TOTAL_H + 12,
            paddingTop: 12,
          }}
        >
          {/* Hour gutter */}
          <div
            className="relative"
            style={{ borderRight: `1px solid ${E.border}` }}
          >
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-3 text-[11px] font-semibold"
                style={{ top: i * CELL_H - 8, color: E.subtle }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="relative">
            {/* Hour lines */}
            {HOURS.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: i * CELL_H,
                  height: CELL_H,
                  borderBottom: `1px dashed ${E.border}`,
                }}
              />
            ))}

            {/* Now line */}
            {nowInRange && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{
                  top: (currentNow - START_MIN) * PX_PER_MIN,
                  borderTop: `2px solid ${E.accent}`,
                }}
              >
                <span
                  className="absolute -left-1.5 -top-2 w-3 h-3 rounded-full"
                  style={{
                    display: "block",
                    background: E.accent,
                    boxShadow: `0 0 0 4px ${E.accentBg}`,
                  }}
                />
              </div>
            )}

            {/* Events */}
            {dayIvs.map((iv) => {
              const start = new Date(iv.scheduledAt);
              const startMin = start.getHours() * 60 + start.getMinutes();
              const endMin = startMin + iv.durationMins;
              const top = (startMin - START_MIN) * PX_PER_MIN;
              const height = Math.max(44, (endMin - startMin) * PX_PER_MIN - 5);

              const startLabel = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
              const endDate = new Date(
                start.getTime() + iv.durationMins * 60_000,
              );
              const endLabel = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

              const past = isInterviewPast(iv.scheduledAt, iv.durationMins);
              const borderColor = past ? E.subtle : E.green;
              const bgColor = past ? "rgba(15,23,42,0.05)" : E.greenBg;
              const timeColor = past ? E.subtle : E.green;
              const btnBg = past ? E.subtle : E.green;

              return (
                <button
                  key={iv.id}
                  onClick={() => onSelectInterview(iv)}
                  className="absolute left-3 right-3 flex items-center gap-3 rounded-[12px] px-4 cursor-pointer text-left transition-all z-[2]"
                  style={{
                    top,
                    height,
                    borderLeft: `4px solid ${borderColor}`,
                    background: bgColor,
                  }}
                >
                  <StudentAvatar name={iv.student.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10.5px] font-bold leading-none mb-1"
                      style={{ color: timeColor }}
                    >
                      {startLabel} – {endLabel}
                    </p>
                    <p
                      className="text-[13px] font-bold truncate leading-tight"
                      style={{ color: E.text }}
                    >
                      {iv.title}
                    </p>
                    {height > 60 && (
                      <p
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: E.muted }}
                      >
                        {iv.student.name} · {iv.internship.title}
                      </p>
                    )}
                  </div>
                  <span
                    className="px-3 py-1.5 text-white text-[11.5px] font-bold rounded-lg flex-shrink-0 transition-colors"
                    style={{ background: btnBg }}
                  >
                    Abrir
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
