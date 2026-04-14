"use client";

import { X } from "lucide-react";

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
  student: { name: string; email: string };
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

const MODULE_ICONS: Record<string, string> = {
  SKILLS: "⚡",
  EXPERIENCE: "💼",
  EDUCATION: "🎓",
  LANGUAGES: "🌐",
  PORTFOLIO: "🗂️",
  CUSTOM: "⭐",
};

function ScoreBar({ score, passed }: { score: number; passed: boolean }) {
  const color = !passed
    ? "bg-red-400"
    : score >= 80
      ? "bg-green-400"
      : score >= 60
        ? "bg-amber-400"
        : "bg-gray-300";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${passed ? score : 100}%` }}
        />
      </div>
      <span className="text-sm font-bold w-10 text-right text-gray-700">
        {passed ? `${score}%` : "❌"}
      </span>
    </div>
  );
}

export default function ScoreBreakdownModal({
  applicant,
  onClose,
}: ScoreBreakdownModalProps) {
  const initial = applicant.student.name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
            <div>
              <p className="font-bold text-gray-900">
                {applicant.student.name}
              </p>
              <p className="text-xs text-gray-400">{applicant.student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Score general */}
          <div className="text-center mb-6">
            {applicant.passedFilters ? (
              <>
                <div className="text-5xl font-extrabold text-brand-600 tracking-tighter">
                  {applicant.atsScore ?? 0}%
                </div>
                <p className="text-sm text-gray-400 mt-1">Score ATS total</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-red-500">
                  Descalificado
                </div>
                <p className="text-xs text-red-400 mt-1">
                  {applicant.filterReason}
                </p>
              </>
            )}
          </div>

          {/* Breakdown por módulo */}
          {applicant.moduleScores && applicant.moduleScores.length > 0 ? (
            <div className="space-y-4">
              {applicant.moduleScores.map((ms) => (
                <div key={ms.moduleId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      {MODULE_ICONS[ms.type] ?? "⭐"} {ms.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      Peso: {ms.weight}%
                    </span>
                  </div>
                  <ScoreBar score={ms.score} passed={ms.passed} />
                  {ms.reason && (
                    <p className="text-xs text-red-400 mt-1">{ms.reason}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">
              Sin datos de scoring. Recalculá el score desde el panel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
