"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import Link from "next/link";
import ModuleCard, { type ATSModuleState } from "@/components/ats/ModuleCard";
import ModuleEditModal from "@/components/ats/ModuleEditModal";
import { PRESET_MODULES } from "@/server/lib/ats/preset-modules";

const MODULE_ICONS: Record<string, string> = {
  SKILLS: "⚡",
  EXPERIENCE: "💼",
  EDUCATION: "🎓",
  LANGUAGES: "🌐",
  PORTFOLIO: "🗂️",
  CUSTOM: "⭐",
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
  const router = useRouter();
  const jobId = params.jobId as string;

  const [activeModules, setActiveModules] = useState<ATSModuleState[]>([]);
  const [editingModule, setEditingModule] = useState<ATSModuleState | null>(
    null,
  );
  const [atsActive, setAtsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  }, [jobId]);

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
        weight: 0, // la empresa ajusta el peso
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

      const confirmed = window.confirm(
        "¿Deseas recalcular los scores de todos los candidatos existentes con la nueva configuración?",
      );
      if (confirmed) {
        await fetch(`/api/ats/score/job/${jobId}`, { method: "POST" });
      }

      router.push(`/dashboard/empresa/candidatos/${jobId}`);
    } finally {
      setSaving(false);
    }
  };

  const inactivePresets = PRESET_MODULES.filter(
    (p) => !activeModules.some((m) => m.type === p.type),
  );

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
            {/* Indicador de peso */}
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
              disabled={!weightsOk || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      </div>

      {/* Modal de edición */}
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
