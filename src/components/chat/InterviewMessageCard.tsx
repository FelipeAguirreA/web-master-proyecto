"use client";

import { Calendar } from "lucide-react";

type InterviewMessageCardProps = {
  content: string;
  createdAt: string;
  isMine?: boolean;
};

export default function InterviewMessageCard({
  content,
  createdAt,
  isMine = false,
}: InterviewMessageCardProps) {
  const hora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <div className={`flex mb-4 ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-[520px] bg-white border border-[#FFD4B5] rounded-[20px] overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#FFEADD] to-[#FFD9BE] px-4 py-2.5 border-b border-[#FFD4B5]">
          <Calendar className="w-4 h-4 text-[#C2410C]" />
          <span className="text-[11px] font-bold text-[#9A3412] uppercase tracking-wide">
            Cita de entrevista
          </span>
        </div>
        <div className="px-4 py-3.5 bg-gradient-to-b from-[#FFF8F2] to-white">
          <p className="text-sm text-[#2a2722] whitespace-pre-wrap leading-relaxed font-mono">
            {content}
          </p>
          <p className="text-[10px] text-[#9B9891] text-right mt-2 tabular-nums">
            {hora}
          </p>
        </div>
      </div>
    </div>
  );
}
