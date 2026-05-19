"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildMonthCells,
  toLocalDateStr,
  MONTHS_ES,
  DAYS_ES_SHORT,
} from "./calendarHelpers";

type Props = {
  year: number;
  month: number;
  selectedDate: string;
  interviewDates: Set<string>;
  weekDates: string[]; // 7 ISO strings for the current week
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export default function MiniMonthCalendar({
  year,
  month,
  selectedDate,
  interviewDates,
  weekDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const cells = buildMonthCells(year, month);
  const todayStr = toLocalDateStr(new Date());
  const weekSet = new Set(weekDates);

  return (
    <div className="bg-surface border border-border rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12.5px] font-bold tracking-[-0.01em] text-text">
          {MONTHS_ES[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={onPrevMonth}
            className="w-6 h-6 inline-flex items-center justify-center rounded-lg transition-all text-subtle hover:text-text"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          <button
            onClick={onNextMonth}
            className="w-6 h-6 inline-flex items-center justify-center rounded-lg transition-all text-subtle hover:text-text"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_ES_SHORT.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-bold uppercase tracking-[0.06em] py-1 text-subtle"
          >
            {d.charAt(0)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-7" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const inCurrentWeek = weekSet.has(dateStr);
          const hasEvent = interviewDates.has(dateStr);

          // Determine cell appearance via Tailwind classes
          let cellClass: string;
          if (isSelected) {
            cellClass =
              "bg-accent text-white font-bold shadow-[0_3px_8px_-2px_var(--color-accent-bdr)]";
          } else if (isToday) {
            cellClass = "bg-accent-bg text-accent font-bold";
          } else if (inCurrentWeek) {
            // 60% opacity accent-bg for current-week days
            cellClass = "bg-accent-bg/60 text-accent font-semibold";
          } else {
            cellClass = "text-muted";
          }

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={[
                "relative flex flex-col items-center justify-center h-7 w-7 mx-auto rounded-lg text-[10.5px] font-medium transition-all",
                cellClass,
              ].join(" ")}
              aria-label={dateStr}
              aria-pressed={isSelected}
            >
              {day}
              {hasEvent && (
                <span
                  className={[
                    "absolute bottom-0.5 w-1 h-1 rounded-full",
                    isSelected ? "bg-white/70" : "bg-accent",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
