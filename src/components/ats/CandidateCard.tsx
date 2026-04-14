"use client";

import { ExternalLink } from "lucide-react";

export interface CandidateData {
  id: string;
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

const PIPELINE_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-gray-100 text-gray-600" },
  REVIEWING: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  INTERVIEW: { label: "Entrevista", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado", color: "bg-red-100 text-red-600" },
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

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm cursor-pointer hover:border-brand-200 hover:shadow-md transition-all"
      onClick={onOpenDetail}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">
            {candidate.student.name}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {candidate.student.studentProfile?.career ??
              candidate.student.email}
          </p>
        </div>
        {showScore && candidate.atsScore !== null && (
          <div
            className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
              !candidate.passedFilters
                ? "bg-red-100 text-red-600"
                : candidate.atsScore >= 80
                  ? "bg-green-100 text-green-700"
                  : candidate.atsScore >= 60
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {candidate.passedFilters ? `${candidate.atsScore}%` : "❌"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pipeline.color}`}
        >
          {pipeline.label}
        </span>
        {candidate.student.studentProfile?.cvUrl && (
          <a
            href={candidate.student.studentProfile.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-gray-400 hover:text-brand-600 flex items-center gap-0.5 transition-colors"
          >
            CV <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
