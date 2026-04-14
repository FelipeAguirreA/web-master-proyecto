"use client";

import { Bot, Settings } from "lucide-react";
import Link from "next/link";

interface ATSToggleProps {
  internshipId: string;
  isActive: boolean;
  hasConfig: boolean;
  onChange: (active: boolean) => void;
}

export default function ATSToggle({
  internshipId,
  isActive,
  hasConfig,
  onChange,
}: ATSToggleProps) {
  const handleToggle = () => {
    if (isActive) {
      const confirmed = window.confirm(
        "¿Desactivar el ATS? Los scores existentes se conservan pero no se recalcularán.",
      );
      if (!confirmed) return;
    }
    onChange(!isActive);
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-brand-100" : "bg-gray-200"}`}
        >
          <Bot
            className={`w-5 h-5 ${isActive ? "text-brand-600" : "text-gray-400"}`}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">Modo ATS</p>
          <p className="text-xs text-gray-400">
            Ranking automático de candidatos
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isActive && (
          <Link
            href={`/dashboard/empresa/ats/${internshipId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {hasConfig ? "Configurar módulos" : "Configurar ATS"} →
          </Link>
        )}

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            isActive ? "bg-brand-600" : "bg-gray-300"
          }`}
          aria-label="Toggle ATS"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
