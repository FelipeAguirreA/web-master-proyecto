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
      <div className="w-full max-w-[520px] bg-gradient-to-b from-brand-50 to-white border border-brand-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 bg-brand-600 px-4 py-2.5">
          <Calendar className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">
            Cita de entrevista
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
            {content}
          </p>
          <p className="text-[11px] text-gray-400 text-right mt-2">{hora}</p>
        </div>
      </div>
    </div>
  );
}
