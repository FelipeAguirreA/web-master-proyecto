"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type CalendarGridProps = {
  year: number;
  month: number; // 0-based
  interviewDates: Set<string>; // "YYYY-MM-DD"
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
  // Lunes=0 ... Domingo=6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toLocalDateStr(new Date());

  // Construir celdas del grid
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Completar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Navegación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-gray-800">
          {MONTHS_ES[month]} {year}
        </h3>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_ES.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-bold text-gray-400 py-1"
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
              className={`relative flex flex-col items-center justify-center h-9 w-9 mx-auto rounded-xl text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-brand-600 text-white"
                  : isToday
                    ? "bg-brand-50 text-brand-700 font-bold"
                    : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {day}
              {hasInterview && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-brand-500"
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
