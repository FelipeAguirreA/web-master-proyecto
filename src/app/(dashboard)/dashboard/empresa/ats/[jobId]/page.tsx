"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Save, RefreshCw } from "lucide-react";
import Link from "next/link";
import ModuleCard, { type ATSModuleState } from "@/components/ats/ModuleCard";
import ModuleEditModal from "@/components/ats/ModuleEditModal";
import { PRESET_MODULES } from "@/server/lib/ats/preset-modules";
import type { CandidateData } from "@/components/ats/CandidateCard";
import ScoreBreakdownModal from "@/components/ats/ScoreBreakdownModal";

const MODULE_ICONS: Record<string, string> = {
  SKILLS: "⚡",
  EXPERIENCE: "💼",
  EDUCATION: "🎓",
  LANGUAGES: "🌐",
  PORTFOLIO: "🗂️",
  CUSTOM: "⭐",
};

const PIPELINE_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-gray-100 text-gray-600" },
  REVIEWING: { label: "En revisión", color: "bg-blue-100 text-blue-700" },
  INTERVIEW: { label: "Entrevista ✨", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rechazado", color: "bg-red-100 text-red-600" },
};

function buildModuleState(mod: {
  id?: string;
  type: string;
  label: string;
  isActive: boolean;
  weight: number;
  order: number;
  params: Record<string, unknown>;
}): ATSModuleState {
  return {
    id: mod.id,
    type: mod.type,
    label: mod.label,
    icon: MODULE_ICONS[mod.type] ?? "⭐",
    isActive: mod.isActive,
    weight: mod.weight,
    order: mod.order,
    params: mod.params,
  };
}

export default function ATSConfigPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  // — Config state —
  const [activeModules, setActiveModules] = useState<ATSModuleState[]>([]);
  const [editingModule, setEditingModule] = useState<ATSModuleState | null>(
    null,
  );
  const [atsActive, setAtsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // — Candidates state —
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateData | null>(null);
  const [scoring, setScoring] = useState(false);

  const loadCandidates = useCallback(
    async (skipAutoScore = false) => {
      const res = await fetch(`/api/applications/internship/${jobId}`);
      if (!res.ok) return;
      const data: CandidateData[] = (await res.json()) ?? [];

      // Auto-calcular si hay candidatos sin score y ATS activo
      if (
        !skipAutoScore &&
        data.length > 0 &&
        data.some((c) => c.atsScore === null)
      ) {
        setScoring(true);
        try {
          await fetch(`/api/ats/score/job/${jobId}`, { method: "POST" });
          const refreshed = await fetch(
            `/api/applications/internship/${jobId}`,
          );
          if (refreshed.ok) {
            const refreshedData: CandidateData[] =
              (await refreshed.json()) ?? [];
            setCandidates(refreshedData);
            return;
          }
        } finally {
          setScoring(false);
        }
      }

      setCandidates(data);
    },
    [jobId],
  );

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ats/config/${jobId}`);
      const data = await res.json();
      if (data.config) {
        setAtsActive(data.config.isActive);
        setActiveModules(
          data.config.modules
            .filter((m: ATSModuleState) => m.isActive)
            .map(buildModuleState),
        );
        // Config ya existe → cargar candidatos
        await loadCandidates();
      } else {
        // Sin config previa: cargar módulos por defecto activos
        const defaults = PRESET_MODULES.filter((p) => p.defaultActive).map(
          (p, i) =>
            buildModuleState({
              type: p.type,
              label: p.label,
              isActive: true,
              weight: p.defaultWeight,
              order: i,
              params: p.defaultParams,
            }),
        );
        setActiveModules(defaults);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, loadCandidates]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const totalWeight = activeModules.reduce((sum, m) => sum + m.weight, 0);
  const weightsOk = activeModules.length === 0 || totalWeight === 100;

  const handleWeightChange = (idx: number, weight: number) => {
    setActiveModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, weight } : m)),
    );
  };

  const handleDeactivate = (idx: number) => {
    setActiveModules((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEdit = (idx: number) => {
    setEditingModule(activeModules[idx]);
  };

  const handleSaveModule = (updated: ATSModuleState) => {
    setActiveModules((prev) =>
      prev.map((m) => (m === editingModule ? updated : m)),
    );
    setEditingModule(null);
  };

  const handleActivatePreset = (preset: (typeof PRESET_MODULES)[0]) => {
    const alreadyActive = activeModules.some((m) => m.type === preset.type);
    if (alreadyActive) return;
    setActiveModules((prev) => [
      ...prev,
      buildModuleState({
        type: preset.type,
        label: preset.label,
        isActive: true,
        weight: 0,
        order: prev.length,
        params: preset.defaultParams,
      }),
    ]);
  };

  const handleAddCustom = () => {
    setActiveModules((prev) => [
      ...prev,
      buildModuleState({
        type: "CUSTOM",
        label: "Módulo personalizado",
        isActive: true,
        weight: 0,
        order: prev.length,
        params: {},
      }),
    ]);
  };

  const handleRecalculate = async () => {
    setScoring(true);
    try {
      await fetch(`/api/ats/score/job/${jobId}`, { method: "POST" });
      await loadCandidates(true);
    } finally {
      setScoring(false);
    }
  };

  const handleSave = async () => {
    if (!weightsOk) return;
    setSaving(true);
    setSaveError(null);

    const allModules = activeModules.map((m, i) => ({
      type: m.type,
      label: m.label,
      isActive: true,
      weight: m.weight,
      order: i,
      params: m.params,
    }));

    try {
      const res = await fetch("/api/ats/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipId: jobId,
          isActive: atsActive,
          modules: allModules,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Error al guardar");
        return;
      }

      // Auto-recalcular y mostrar candidatos
      await handleRecalculate();
    } finally {
      setSaving(false);
    }
  };

  const inactivePresets = PRESET_MODULES.filter(
    (p) => !activeModules.some((m) => m.type === p.type),
  );

  const ranked = [...candidates].sort((a, b) => {
    if (a.passedFilters && !b.passedFilters) return -1;
    if (!a.passedFilters && b.passedFilters) return 1;
    return (b.atsScore ?? 0) - (a.atsScore ?? 0);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <div className="max-w-screen-xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/empresa"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900">
              Configuración ATS 🤖
            </h1>
            <p className="text-gray-400 mt-1">
              Configurá los módulos de evaluación y sus pesos para rankear
              candidatos automáticamente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`text-sm font-bold px-4 py-2 rounded-xl ${
                weightsOk
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              Total: {totalWeight}% {weightsOk ? "✓" : "≠ 100%"}
            </div>

            <button
              onClick={handleSave}
              disabled={!weightsOk || saving || scoring}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving
                ? "Guardando..."
                : scoring
                  ? "Calculando..."
                  : "Guardar y calcular"}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {saveError}
          </div>
        )}

        {/* Config grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Módulos activos */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Módulos activos
            </h2>

            {activeModules.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-400">
                  No hay módulos activos. Activá módulos desde la columna
                  derecha.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeModules.map((mod, idx) => (
                  <ModuleCard
                    key={`${mod.type}-${idx}`}
                    module={mod}
                    onEdit={() => handleEdit(idx)}
                    onDeactivate={() => handleDeactivate(idx)}
                    onWeightChange={(w) => handleWeightChange(idx, w)}
                  />
                ))}
              </div>
            )}

            {!weightsOk && activeModules.length > 0 && (
              <p className="mt-3 text-xs text-red-500 font-medium">
                Los pesos deben sumar exactamente 100%. Actual: {totalWeight}%
              </p>
            )}
          </div>

          {/* Módulos disponibles */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
              Módulos disponibles
            </h2>

            <div className="space-y-3">
              {inactivePresets.map((preset) => (
                <div
                  key={preset.type}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3"
                >
                  <span className="text-xl">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-700">
                      {preset.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {preset.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleActivatePreset(preset)}
                    className="flex-shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Activar
                  </button>
                </div>
              ))}

              <button
                onClick={handleAddCustom}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear módulo personalizado
              </button>
            </div>
          </div>
        </div>

        {/* ── Ranking de candidatos ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Ranking de candidatos
            </h2>
            {candidates.length > 0 && (
              <button
                onClick={handleRecalculate}
                disabled={scoring}
                className="flex items-center gap-2 text-xs font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${scoring ? "animate-spin" : ""}`}
                />
                {scoring ? "Calculando..." : "Recalcular"}
              </button>
            )}
          </div>

          {scoring ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Calculando scores…</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <p className="text-sm text-gray-400">
                Aún no hay postulaciones para esta práctica.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4 w-8">
                      #
                    </th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                      Candidato
                    </th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                      Score ATS
                    </th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                      Match CV
                    </th>
                    <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-4">
                      Pipeline
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, idx) => {
                    const pipeline =
                      PIPELINE_LABELS[c.pipelineStatus] ??
                      PIPELINE_LABELS.PENDING;
                    const initial = c.student.name.charAt(0).toUpperCase();
                    const isDisqualified = !c.passedFilters;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isDisqualified ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-gray-400">
                          {isDisqualified ? "—" : idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {initial}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {c.student.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {c.student.studentProfile?.career ??
                                  c.student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isDisqualified ? (
                            <span className="text-xs text-red-500 font-semibold">
                              ❌{" "}
                              {c.filterReason?.split(":")[0] ?? "Descalificado"}
                            </span>
                          ) : c.atsScore !== null ? (
                            <span
                              className={`text-sm font-extrabold ${
                                c.atsScore >= 80
                                  ? "text-green-600"
                                  : c.atsScore >= 60
                                    ? "text-amber-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {c.atsScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin calcular
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.matchScore !== null ? (
                            <span className="text-sm font-semibold text-gray-600">
                              {Math.round(c.matchScore)}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pipeline.color}`}
                          >
                            {pipeline.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {selectedCandidate && (
        <ScoreBreakdownModal
          applicant={{
            id: selectedCandidate.id,
            student: selectedCandidate.student,
            atsScore: selectedCandidate.atsScore,
            moduleScores: selectedCandidate.moduleScores as Parameters<
              typeof ScoreBreakdownModal
            >[0]["applicant"]["moduleScores"],
            passedFilters: selectedCandidate.passedFilters,
            filterReason: selectedCandidate.filterReason,
            pipelineStatus: selectedCandidate.pipelineStatus,
          }}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Modal de edición de módulo */}
      {editingModule && (
        <ModuleEditModal
          module={editingModule}
          onSave={handleSaveModule}
          onClose={() => setEditingModule(null)}
        />
      )}
    </div>
  );
}
