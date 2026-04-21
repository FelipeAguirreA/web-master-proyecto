"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  RefreshCw,
  Sparkles,
  Users,
  AlertCircle,
  Zap,
  Briefcase,
  GraduationCap,
  Globe,
  Folder,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const PRESET_LUCIDE: Record<string, LucideIcon> = {
  SKILLS: Zap,
  EXPERIENCE: Briefcase,
  EDUCATION: GraduationCap,
  LANGUAGES: Globe,
  PORTFOLIO: Folder,
  CUSTOM: Star,
};

const PIPELINE_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-[#F5F4F1] text-[#6D6A63] border-[#E8E5DD]",
  },
  REVIEWING: {
    label: "En revisión",
    className: "bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]",
  },
  INTERVIEW: {
    label: "Entrevista",
    className: "bg-[#ECFDF3] text-[#047857] border-[#D1FAE5]",
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-[#FEF2F2] text-[#B91C1C] border-[#FEE2E2]",
  },
};

function avatarGradient(name: string): string {
  const gradients = [
    "from-[#FF6A3D] to-[#C2410C]",
    "from-[#F59E0B] to-[#B45309]",
    "from-[#10B981] to-[#047857]",
    "from-[#3B82F6] to-[#1D4ED8]",
    "from-[#8B5CF6] to-[#6D28D9]",
    "from-[#EC4899] to-[#BE185D]",
    "from-[#0A0909] to-[#2a2722]",
    "from-[#F97316] to-[#9A3412]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return gradients[hash % gradients.length];
}

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

  const [activeModules, setActiveModules] = useState<ATSModuleState[]>([]);
  const [editingModule, setEditingModule] = useState<ATSModuleState | null>(
    null,
  );
  const [atsActive, setAtsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateData | null>(null);
  const [scoring, setScoring] = useState(false);

  const loadCandidates = useCallback(
    async (skipAutoScore = false) => {
      const res = await fetch(`/api/applications/internship/${jobId}`);
      if (!res.ok) return;
      const data: CandidateData[] = (await res.json()) ?? [];

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
        await loadCandidates();
      } else {
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const saveLabel = saving
    ? "Guardando..."
    : scoring
      ? "Calculando..."
      : "Guardar y calcular";

  return (
    <div className="px-4 md:px-8 py-6 md:py-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/empresa"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6D6A63] hover:text-[#0A0909] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al dashboard
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-white border border-[#E8E5DD] shadow-[0_8px_32px_-16px_rgba(20,15,10,0.1)] p-6 md:p-8 mb-8">
          <div
            className="pointer-events-none absolute -top-24 -right-16 w-[340px] h-[340px] rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,106,61,0.15), transparent 72%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FFF0E4] to-[#FFE1CB] border border-[#FFD4B5] mb-3">
                <Sparkles
                  className="w-3 h-3 text-[#C2410C]"
                  strokeWidth={2.4}
                />
                <span className="text-[10px] font-bold text-[#9A3412] uppercase tracking-wider">
                  Configuración ATS
                </span>
              </div>
              <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tighter text-[#0A0909] leading-[1.05]">
                Rankeá candidatos con criterios propios
              </h1>
              <p className="text-[14px] text-[#6D6A63] mt-2 max-w-xl leading-relaxed">
                Activá los módulos de evaluación y ajustá sus pesos. El score se
                recalcula automáticamente cuando guardás.
              </p>
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-2.5 flex-shrink-0">
              <div
                className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-xl border tabular-nums ${
                  weightsOk
                    ? "bg-[#ECFDF3] text-[#047857] border-[#D1FAE5]"
                    : "bg-[#FEF2F2] text-[#B91C1C] border-[#FEE2E2]"
                }`}
              >
                Total {totalWeight}% {weightsOk ? "·  ok" : "· debe ser 100%"}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/empresa/candidatos/${jobId}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white text-[#4A4843] text-[12.5px] font-semibold rounded-xl border border-black/[0.08] hover:border-black/[0.15] hover:text-[#0A0909] transition-all"
                >
                  <Users className="w-3.5 h-3.5" strokeWidth={2.2} />
                  Gestionar candidatos
                </Link>

                <button
                  onClick={handleSave}
                  disabled={!weightsOk || saving || scoring}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] text-white text-[13px] font-bold rounded-xl shadow-md shadow-[#FF6A3D]/20 hover:shadow-lg hover:shadow-[#FF6A3D]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="flex items-start gap-2.5 mb-6 p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl">
            <AlertCircle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#B91C1C]">{saveError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <section className="bg-white border border-[#E8E5DD] rounded-[24px] p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-[#6D6A63] uppercase tracking-wider">
                Módulos activos
              </h2>
              {activeModules.length > 0 && (
                <span className="text-[10px] font-semibold text-[#9B9891] uppercase tracking-wider">
                  {activeModules.length}{" "}
                  {activeModules.length === 1 ? "activo" : "activos"}
                </span>
              )}
            </div>

            {activeModules.length === 0 ? (
              <div className="bg-[#FAFAF8] border border-dashed border-[#E8E5DD] rounded-[16px] p-8 text-center">
                <p className="text-[13px] text-[#6D6A63]">
                  Sin módulos activos. Activá desde la columna derecha.
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
              <p className="mt-3 text-[11px] text-[#B91C1C] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                Los pesos deben sumar 100%. Ahora: {totalWeight}%
              </p>
            )}
          </section>

          <section className="bg-white border border-[#E8E5DD] rounded-[24px] p-5 md:p-6 shadow-sm">
            <h2 className="text-[11px] font-bold text-[#6D6A63] uppercase tracking-wider mb-4">
              Módulos disponibles
            </h2>

            <div className="space-y-3">
              {inactivePresets.map((preset) => {
                const Icon = PRESET_LUCIDE[preset.type] ?? Star;
                return (
                  <div
                    key={preset.type}
                    className="bg-[#FAFAF8] border border-[#E8E5DD] rounded-[16px] p-4 flex items-center gap-3 hover:border-[#FFD4B5] hover:bg-white transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E5DD] flex items-center justify-center flex-shrink-0">
                      <Icon
                        className="w-4 h-4 text-[#4A4843]"
                        strokeWidth={2.2}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#0A0909] tracking-tight">
                        {preset.label}
                      </p>
                      <p className="text-[11.5px] text-[#6D6A63] mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleActivatePreset(preset)}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#C2410C] hover:text-white bg-[#FFF0E4] hover:bg-gradient-to-br hover:from-[#FF6A3D] hover:to-[#C2410C] border border-[#FFD4B5] hover:border-transparent px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Activar
                    </button>
                  </div>
                );
              })}

              <button
                onClick={handleAddCustom}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-[#FFD4B5] text-[#C2410C] hover:bg-[#FFF4EE] hover:border-[#FF6A3D] rounded-[16px] py-3.5 text-[12.5px] font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear módulo personalizado
              </button>
            </div>
          </section>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E5DD] flex items-center justify-center shadow-sm">
                <Users className="w-4 h-4 text-[#FF6A3D]" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-[11px] font-bold text-[#6D6A63] uppercase tracking-wider">
                  Ranking de candidatos
                </h2>
                <p className="text-[11px] text-[#9B9891] mt-0.5">
                  {candidates.length}{" "}
                  {candidates.length === 1 ? "postulación" : "postulaciones"}
                </p>
              </div>
            </div>
            {candidates.length > 0 && (
              <button
                onClick={handleRecalculate}
                disabled={scoring}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0A0909] bg-white hover:bg-[#F5F4F1] border border-[#E8E5DD] px-3 py-2 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#FF6A3D] ${scoring ? "animate-spin" : ""}`}
                />
                {scoring ? "Calculando..." : "Recalcular"}
              </button>
            )}
          </div>

          {scoring ? (
            <div className="bg-white border border-[#E8E5DD] rounded-[24px] p-12 text-center shadow-sm">
              <div className="w-10 h-10 border-[3px] border-[#FF6A3D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-[#6D6A63] font-medium">
                Calculando scores…
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white border border-[#E8E5DD] rounded-[24px] p-12 text-center shadow-sm">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-[#FAFAF8] items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#9B9891]" />
              </div>
              <p className="text-[13px] text-[#6D6A63]">
                Aún no hay postulaciones para esta práctica.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8E5DD] rounded-[24px] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E5DD] bg-[#FAFAF8]">
                    <th className="text-left text-[10px] font-bold text-[#9B9891] uppercase tracking-wider px-6 py-3.5 w-10">
                      #
                    </th>
                    <th className="text-left text-[10px] font-bold text-[#9B9891] uppercase tracking-wider px-6 py-3.5">
                      Candidato
                    </th>
                    <th className="text-left text-[10px] font-bold text-[#9B9891] uppercase tracking-wider px-6 py-3.5">
                      Score ATS
                    </th>
                    <th className="text-left text-[10px] font-bold text-[#9B9891] uppercase tracking-wider px-6 py-3.5">
                      Match CV
                    </th>
                    <th className="text-left text-[10px] font-bold text-[#9B9891] uppercase tracking-wider px-6 py-3.5">
                      Pipeline
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, idx) => {
                    const pipeline =
                      PIPELINE_STYLES[c.pipelineStatus] ??
                      PIPELINE_STYLES.PENDING;
                    const initial = c.student.name.charAt(0).toUpperCase();
                    const isDisqualified = !c.passedFilters;
                    const scoreClass =
                      c.atsScore !== null
                        ? c.atsScore >= 80
                          ? "text-[#047857]"
                          : c.atsScore >= 60
                            ? "text-[#C2410C]"
                            : "text-[#6D6A63]"
                        : "text-[#9B9891]";

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`border-b border-[#F0EDE4] last:border-0 hover:bg-[#FAFAF8] transition-colors cursor-pointer ${
                          isDisqualified ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-[12px] font-bold text-[#9B9891] tabular-nums">
                          {isDisqualified ? "—" : idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0 shadow-sm bg-gradient-to-br ${avatarGradient(
                                c.student.name,
                              )}`}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-[#0A0909] truncate tracking-tight">
                                {c.student.name}
                              </p>
                              <p className="text-[11px] text-[#9B9891] truncate">
                                {c.student.studentProfile?.career ??
                                  c.student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isDisqualified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-1 rounded-lg">
                              <AlertCircle className="w-3 h-3" />
                              {c.filterReason?.split(":")[0] ?? "Descalificado"}
                            </span>
                          ) : c.atsScore !== null ? (
                            <span
                              className={`text-[14px] font-extrabold tabular-nums ${scoreClass}`}
                            >
                              {c.atsScore}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9B9891]">
                              Sin calcular
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.matchScore !== null ? (
                            <span className="text-[13px] font-semibold text-[#4A4843] tabular-nums">
                              {Math.round(c.matchScore)}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#C9C6BF]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${pipeline.className}`}
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
        </section>
      </div>

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
