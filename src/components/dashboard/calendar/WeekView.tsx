"use client";

import { useEffect, useRef, useState } from "react";
import {
  toLocalDateStr,
  nowMinutes,
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
  weekDates: string[]; // 7 ISO "YYYY-MM-DD" strings, Mon–Sun
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
const PX_PER_MIN = 0.8;
const CELL_H = 60 * PX_PER_MIN;
const TOTAL_H = (END_MIN - START_MIN) * PX_PER_MIN; // 1152px

// Only show Mon–Fri (indices 0–4) in week view
const WORKDAYS = 5;

function StudentInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold flex-shrink-0"
      style={{ background: E.accentBg, color: E.accent }}
    >
      {initials}
    </span>
  );
}

export default function WeekView({
  weekDates,
  interviews,
  onSelectInterview,
}: Props) {
  const todayStr = toLocalDateStr(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentNow, setCurrentNow] = useState(nowMinutes());

  // Update now-line every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentNow(nowMinutes()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to earliest interview of the week, or 07:00 if none
  useEffect(() => {
    if (!containerRef.current) return;
    const workDatesSet = new Set(weekDates.slice(0, WORKDAYS));
    const weekIvs = interviews.filter((iv) =>
      workDatesSet.has(toLocalDateStr(new Date(iv.scheduledAt))),
    );
    let targetMin = 7 * 60; // default: 07:00
    if (weekIvs.length > 0) {
      const earliest = weekIvs.reduce((min, iv) => {
        const d = new Date(iv.scheduledAt);
        const m = d.getHours() * 60 + d.getMinutes();
        return m < min ? m : min;
      }, Infinity);
      targetMin = Math.max(0, earliest - 30); // 30-min buffer above first event
    }
    containerRef.current.scrollTop = targetMin * PX_PER_MIN;
  }, [weekDates, interviews]);

  // Only show Mon–Fri
  const workDates = weekDates.slice(0, WORKDAYS);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable container — day headers live INSIDE here as sticky rows
          so they share the exact same width context as the body columns.
          When the vertical scrollbar appears it shrinks both identically. */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {/* Day headers — sticky at top of scroll container */}
        <div
          className="grid sticky top-0 z-20"
          style={{
            gridTemplateColumns: `56px repeat(${WORKDAYS}, 1fr)`,
            borderBottom: `1px solid ${E.border}`,
            background: E.surface,
          }}
        >
          <div style={{ borderRight: `1px solid ${E.border}` }} />
          {workDates.map((dateStr, i) => {
            const d = new Date(dateStr + "T12:00:00");
            const dayNum = d.getDate();
            const isToday = dateStr === todayStr;
            return (
              <div
                key={dateStr}
                className="py-3 px-2 text-center"
                style={{ borderLeft: `1px solid ${E.border}` }}
              >
                <div
                  className="text-[9.5px] font-bold uppercase tracking-[0.06em] mb-1"
                  style={{ color: isToday ? E.accent : E.subtle }}
                >
                  {DAYS_ES_SHORT[i]}
                </div>
                <div
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-bold mx-auto"
                  style={
                    isToday
                      ? {
                          background: E.accent,
                          color: "#fff",
                          boxShadow: `0 4px 10px -2px ${E.accentBdr}`,
                        }
                      : { color: E.text }
                  }
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour grid body — paddingTop gives the 00:00 label room so the
            sticky day-header doesn't cover it. */}
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `56px repeat(${WORKDAYS}, 1fr)`,
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
                className="absolute right-2 text-[9.5px] font-semibold"
                style={{ top: i * CELL_H - 7, color: E.subtle }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {workDates.map((dateStr) => {
            const isToday = dateStr === todayStr;
            const dayIvs = interviews
              .filter(
                (iv) => toLocalDateStr(new Date(iv.scheduledAt)) === dateStr,
              )
              .sort(
                (a, b) =>
                  new Date(a.scheduledAt).getTime() -
                  new Date(b.scheduledAt).getTime(),
              );

            const nowInRange =
              isToday && currentNow >= START_MIN && currentNow < END_MIN;

            return (
              <div
                key={dateStr}
                className="relative"
                style={{ borderLeft: `1px solid ${E.border}` }}
              >
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
                    <span
                      className="absolute right-2 -top-3 text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: E.accent,
                        background: E.surface,
                        border: `1px solid ${E.accentBdr}`,
                      }}
                    >
                      {String(Math.floor(currentNow / 60)).padStart(2, "0")}:
                      {String(currentNow % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}

                {/* Events */}
                {dayIvs.map((iv) => {
                  const d = new Date(iv.scheduledAt);
                  const startMin = d.getHours() * 60 + d.getMinutes();
                  const endMin = startMin + iv.durationMins;
                  const top = (startMin - START_MIN) * PX_PER_MIN;
                  const height = Math.max(
                    28,
                    (endMin - startMin) * PX_PER_MIN - 3,
                  );
                  const isShort = height < 46;
                  const past = isInterviewPast(iv.scheduledAt, iv.durationMins);
                  const borderColor = past ? E.subtle : E.green;
                  const bgColor = past ? "rgba(15,23,42,0.05)" : E.greenBg;
                  const timeColor = past ? E.subtle : E.green;

                  return (
                    <button
                      key={iv.id}
                      onClick={() => onSelectInterview(iv)}
                      className="absolute left-1 right-1 rounded-[8px] text-left px-2 py-1.5 cursor-pointer overflow-hidden transition-all z-[2] hover:z-[5]"
                      style={{
                        top,
                        height,
                        borderLeft: `3px solid ${borderColor}`,
                        background: bgColor,
                      }}
                    >
                      <div
                        className="text-[9px] font-bold leading-none mb-0.5"
                        style={{ color: timeColor }}
                      >
                        {String(d.getHours()).padStart(2, "0")}:
                        {String(d.getMinutes()).padStart(2, "0")}
                        {" – "}
                        {String(
                          new Date(iv.scheduledAt).getHours() +
                            Math.floor(iv.durationMins / 60),
                        ).padStart(2, "0")}
                        :
                        {String(
                          (new Date(iv.scheduledAt).getMinutes() +
                            (iv.durationMins % 60)) %
                            60,
                        ).padStart(2, "0")}
                      </div>
                      {!isShort && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <StudentInitials name={iv.student.name} />
                          <span
                            className="text-[10.5px] font-bold truncate leading-tight"
                            style={{ color: E.text }}
                          >
                            {iv.title}
                          </span>
                        </div>
                      )}
                      {isShort && (
                        <div
                          className="text-[10px] font-bold truncate leading-tight"
                          style={{ color: E.text }}
                        >
                          {iv.title}
                        </div>
                      )}
                      {height > 54 && (
                        <div
                          className="text-[9.5px] truncate mt-0.5 leading-tight"
                          style={{ color: E.muted }}
                        >
                          {iv.student.name}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
