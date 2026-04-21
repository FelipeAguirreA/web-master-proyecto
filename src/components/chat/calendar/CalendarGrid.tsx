"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarGridProps = {
  year: number;
  month: number;
  interviewDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
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

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CalendarGrid({
  year,
  month,
  interviewDates,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarGridProps) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toLocalDateStr(new Date());

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-[20px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
      {/* Navegación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#6D6A63] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
        </button>
        <h3 className="text-[13.5px] font-semibold text-[#0A0909] tracking-[-0.01em]">
          {MONTHS_ES[month]}{" "}
          <span className="text-[#9B9891] font-medium">{year}</span>
        </h3>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#6D6A63] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS_ES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] py-1.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayStr;
          const hasInterview = interviewDates.has(dateStr);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? "" : dateStr)}
              className={`relative flex flex-col items-center justify-center h-9 w-9 mx-auto rounded-xl text-[12.5px] font-medium transition-all ${
                isSelected
                  ? "bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white shadow-[0_4px_12px_-3px_rgba(255,106,61,0.5)] font-bold"
                  : isToday
                    ? "bg-[#FFF3EC] text-[#FF6A3D] font-bold"
                    : "text-[#4A4843] hover:bg-black/[0.04] hover:text-[#0A0909]"
              }`}
            >
              {day}
              {hasInterview && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    isSelected ? "bg-white" : "bg-[#FF6A3D]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
