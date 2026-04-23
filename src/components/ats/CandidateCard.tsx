"use client";

import { ExternalLink } from "lucide-react";

export interface CandidateData {
  id: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: {
      career?: string | null;
      university?: string | null;
      cvUrl?: string | null;
    } | null;
  };
  atsScore: number | null;
  moduleScores: unknown;
  passedFilters: boolean;
  filterReason: string | null;
  pipelineStatus: string;
  matchScore: number | null;
}

const PIPELINE_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-[#F5F4F1] text-[#6D6A63] border-black/[0.06]",
  },
  REVIEWING: {
    label: "En revisión",
    className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  },
  INTERVIEW: {
    label: "Entrevista",
    className: "bg-[#ECFDF3] text-[#047857] border-[#A7F3D0]",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  },
};

interface CandidateCardProps {
  candidate: CandidateData;
  showScore?: boolean;
  onOpenDetail?: () => void;
}

export default function CandidateCard({
  candidate,
  showScore = true,
  onOpenDetail,
}: CandidateCardProps) {
  const initial = candidate.student.name.charAt(0).toUpperCase();
  const pipeline =
    PIPELINE_LABELS[candidate.pipelineStatus] ?? PIPELINE_LABELS.PENDING;

  const scoreChipClass = !candidate.passedFilters
    ? "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
    : (candidate.atsScore ?? 0) >= 80
      ? "bg-[#ECFDF3] text-[#047857] border-[#A7F3D0]"
      : (candidate.atsScore ?? 0) >= 60
        ? "bg-[#FFF7EC] text-[#B45309] border-[#FCD9A8]"
        : "bg-[#F5F4F1] text-[#6D6A63] border-black/[0.06]";

  return (
    <div
      className="group bg-white border border-black/[0.06] rounded-2xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer hover:border-black/[0.12] hover:shadow-[0_4px_12px_-4px_rgba(20,15,10,0.1)] transition-all"
      onClick={onOpenDetail}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center font-bold text-[12px] flex-shrink-0 shadow-[0_2px_6px_-1px_rgba(255,106,61,0.4)]">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
            {candidate.student.name}
          </p>
          <p className="text-[11.5px] text-[#6D6A63] truncate mt-0.5">
            {candidate.student.studentProfile?.career ??
              candidate.student.email}
          </p>
        </div>
        {showScore && candidate.atsScore !== null && (
          <div
            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 border ${scoreChipClass}`}
          >
            {candidate.passedFilters ? `${candidate.atsScore}%` : "✕"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pipeline.className}`}
        >
          {pipeline.label}
        </span>
        {candidate.student.studentProfile?.cvUrl && (
          <a
            href={candidate.student.studentProfile.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-medium text-[#9B9891] hover:text-[#FF6A3D] inline-flex items-center gap-0.5 transition-colors px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-[#FFF3EC]"
          >
            CV <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
          </a>
        )}
      </div>
    </div>
  );
}
