"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { ATSModuleState } from "./ModuleCard";

interface ModuleEditModalProps {
  module: ATSModuleState;
  onSave: (updated: ATSModuleState) => void;
  onClose: () => void;
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
    }
    setInput("");
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 bg-brand-50 text-brand-700 text-xs px-2 py-1 rounded-lg font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? "Escribí y presioná Enter"}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400"
        />
        <button
          type="button"
          onClick={add}
          className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ModuleEditModal({
  module,
  onSave,
  onClose,
}: ModuleEditModalProps) {
  const [params, setParams] = useState<Record<string, unknown>>(
    JSON.parse(JSON.stringify(module.params)),
  );
  const [label, setLabel] = useState(module.label);

  const updateParam = (key: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...module, label, params });
    onClose();
  };

  const renderFields = () => {
    switch (module.type) {
      case "SKILLS":
        return (
          <>
            <TagInput
              label="Skills requeridas (descalifica si faltan con hardFilter)"
              values={(params.required as string[]) ?? []}
              onChange={(v) => updateParam("required", v)}
              placeholder="ej: React, TypeScript"
            />
            <TagInput
              label="Skills preferidas (bonus)"
              values={(params.preferred as string[]) ?? []}
              onChange={(v) => updateParam("preferred", v)}
              placeholder="ej: Docker, AWS"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.hardFilter as boolean) ?? false}
                onChange={(e) => updateParam("hardFilter", e.target.checked)}
                className="accent-brand-600"
              />
              Hard filter: descalificar si falta una skill requerida
            </label>
          </>
        );
      case "EXPERIENCE":
        return (
          <>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Años mínimos de experiencia
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={(params.minYears as number) ?? 0}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  updateParam("minYears", isNaN(raw) ? 0 : raw);
                }}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400"
              />
            </div>
            <TagInput
              label="Roles preferidos"
              values={(params.preferredRoles as string[]) ?? []}
              onChange={(v) => updateParam("preferredRoles", v)}
              placeholder="ej: developer, analyst"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.hardFilter as boolean) ?? false}
                onChange={(e) => updateParam("hardFilter", e.target.checked)}
                className="accent-brand-600"
              />
              Hard filter: descalificar si tiene menos años de experiencia
            </label>
          </>
        );
      case "EDUCATION":
        return (
          <>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Promedio mínimo (0 = sin requisito)
              </label>
              <input
                type="number"
                min={0}
                max={7}
                step={0.1}
                value={(params.minGPA as number) ?? 0}
                onChange={(e) =>
                  updateParam("minGPA", parseFloat(e.target.value))
                }
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400"
              />
            </div>
            <TagInput
              label="Carreras preferidas"
              values={(params.preferredDegrees as string[]) ?? []}
              onChange={(v) => updateParam("preferredDegrees", v)}
              placeholder="ej: Ingeniería, Computer Science"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.hardFilter as boolean) ?? false}
                onChange={(e) => updateParam("hardFilter", e.target.checked)}
                className="accent-brand-600"
              />
              Hard filter: descalificar si promedio es menor al mínimo
            </label>
          </>
        );
      case "LANGUAGES":
        return (
          <>
            <TagInput
              label="Idiomas requeridos (ej: Inglés B2)"
              values={(params.required as string[]) ?? []}
              onChange={(v) => updateParam("required", v)}
              placeholder="ej: Inglés B2, Portugués A2"
            />
            <TagInput
              label="Idiomas preferidos"
              values={(params.preferred as string[]) ?? []}
              onChange={(v) => updateParam("preferred", v)}
              placeholder="ej: Francés A1"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.hardFilter as boolean) ?? false}
                onChange={(e) => updateParam("hardFilter", e.target.checked)}
                className="accent-brand-600"
              />
              Hard filter: descalificar si no cumple idioma requerido
            </label>
          </>
        );
      case "PORTFOLIO":
        return (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.required as boolean) ?? false}
                onChange={(e) => updateParam("required", e.target.checked)}
                className="accent-brand-600"
              />
              Portafolio requerido
            </label>
            <TagInput
              label="Palabras clave a detectar"
              values={(params.keywords as string[]) ?? []}
              onChange={(v) => updateParam("keywords", v)}
              placeholder="ej: github, behance, portfolio"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={(params.hardFilter as boolean) ?? false}
                onChange={(e) => updateParam("hardFilter", e.target.checked)}
                className="accent-brand-600"
              />
              Hard filter: descalificar si no tiene portafolio
            </label>
          </>
        );
      case "CUSTOM":
        return (
          <p className="text-sm text-gray-400 italic">
            Los módulos personalizados se puntúan manualmente en el dashboard de
            candidatos.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{module.icon}</span>
            <h2 className="text-lg font-bold text-gray-900">{module.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {module.type === "CUSTOM" && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Nombre del módulo
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400"
              />
            </div>
          )}
          {renderFields()}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/20"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
