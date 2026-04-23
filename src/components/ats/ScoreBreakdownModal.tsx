"use client";

import { createPortal } from "react-dom";
import {
  X,
  Zap,
  Briefcase,
  GraduationCap,
  Globe,
  Folder,
  Star,
} from "lucide-react";

interface ModuleScore {
  moduleId: string;
  type: string;
  label: string;
  weight: number;
  score: number;
  passed: boolean;
  reason?: string;
}

interface Applicant {
  id: string;
  student: {
    name: string;
    email: string;
    image?: string | null;
  };
  atsScore: number | null;
  moduleScores: ModuleScore[] | null;
  passedFilters: boolean;
  filterReason: string | null;
  pipelineStatus: string;
}

interface ScoreBreakdownModalProps {
  applicant: Applicant;
  onClose: () => void;
}

const MODULE_ICONS: Record<string, typeof Zap> = {
  SKILLS: Zap,
  EXPERIENCE: Briefcase,
  EDUCATION: GraduationCap,
  LANGUAGES: Globe,
  PORTFOLIO: Folder,
  CUSTOM: Star,
};

function ScoreBar({ score, passed }: { score: number; passed: boolean }) {
  const fillClass = !passed
    ? "bg-[#EF4444]"
    : score >= 80
      ? "bg-[#10B981]"
      : score >= 60
        ? "bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A]"
        : "bg-[#C9C6BF]";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#F5F4F1] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all ${fillClass}`}
          style={{ width: `${passed ? Math.max(score, 4) : 100}%` }}
        />
      </div>
      <span
        className={`text-[12.5px] font-bold w-10 text-right tracking-[-0.01em] ${
          !passed
            ? "text-[#B91C1C]"
            : score >= 80
              ? "text-[#047857]"
              : score >= 60
                ? "text-[#C2410C]"
                : "text-[#6D6A63]"
        }`}
      >
        {passed ? `${score}%` : "✕"}
      </span>
    </div>
  );
}

export default function ScoreBreakdownModal({
  applicant,
  onClose,
}: ScoreBreakdownModalProps) {
  const initial = applicant.student.name.charAt(0).toUpperCase();

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <div
        className="absolute inset-0 bg-[#0A0909]/50 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-[24px] sm:rounded-[24px] rounded-b-none sm:rounded-b-[24px] shadow-[0_32px_64px_-16px_rgba(20,15,10,0.3)] border border-black/[0.06] w-full sm:max-w-md max-h-[calc(100dvh-80px)] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-4 sm:px-6 py-4 sm:py-5 border-b border-black/[0.05] flex items-center justify-between gap-3 rounded-t-[24px]">
          <div className="flex items-center gap-3">
            {applicant.student.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={applicant.student.image}
                alt={applicant.student.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-[0_4px_12px_-3px_rgba(20,15,10,0.2)]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] text-white flex items-center justify-center font-bold text-[15px] shadow-[0_4px_12px_-3px_rgba(255,106,61,0.45)]">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
                {applicant.student.name}
              </p>
              <p className="text-[12px] text-[#6D6A63] truncate mt-0.5">
                {applicant.student.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-11 h-11 -mr-2 inline-flex items-center justify-center rounded-xl text-[#9B9891] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-6">
          {/* Score general */}
          <div className="text-center mb-7">
            {applicant.atsScore === null ? (
              <>
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
                  <p className="text-[18px] font-bold text-[#6D6A63] tracking-[-0.02em]">
                    Calculando
                  </p>
                </div>
                <p className="text-[12.5px] text-[#9B9891] mt-2">
                  El score se está procesando
                </p>
              </>
            ) : !applicant.passedFilters ? (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FEF2F2] border border-[#FECACA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[11.5px] font-semibold text-[#B91C1C] uppercase tracking-[0.08em]">
                    Descalificado
                  </span>
                </div>
                <p className="text-[13px] text-[#6D6A63] mt-3 leading-relaxed">
                  {applicant.filterReason}
                </p>
              </>
            ) : (
              <>
                <div className="text-[56px] font-bold bg-gradient-to-r from-[#FFB17A] via-[#FF8A52] to-[#FF5A28] bg-clip-text text-transparent tracking-[-0.04em] leading-none">
                  {applicant.atsScore}
                  <span className="text-[32px]">%</span>
                </div>
                <p className="text-[11.5px] font-semibold text-[#9B9891] uppercase tracking-[0.08em] mt-2">
                  Score ATS total
                </p>
              </>
            )}
          </div>

          {/* Breakdown por módulo */}
          {applicant.moduleScores && applicant.moduleScores.length > 0 ? (
            <div className="space-y-4">
              {applicant.moduleScores.map((ms) => {
                const Icon = MODULE_ICONS[ms.type] ?? Star;
                return (
                  <div key={ms.moduleId}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                        <Icon
                          className="w-3.5 h-3.5 text-[#6D6A63]"
                          strokeWidth={2.2}
                        />
                        {ms.label}
                      </span>
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9B9891]">
                        Peso {ms.weight}%
                      </span>
                    </div>
                    <ScoreBar score={ms.score} passed={ms.passed} />
                    {ms.reason && (
                      <p className="text-[11.5px] text-[#B91C1C] mt-1.5 leading-relaxed">
                        {ms.reason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : applicant.atsScore !== null ? (
            <p className="text-[12.5px] text-[#9B9891] text-center">
              No hay módulos activos en la configuración ATS.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
