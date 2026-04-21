"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Zap,
  Briefcase,
  GraduationCap,
  Globe,
  Folder,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ATSModuleState } from "./ModuleCard";

interface ModuleEditModalProps {
  module: ATSModuleState;
  onSave: (updated: ATSModuleState) => void;
  onClose: () => void;
}

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  SKILLS: Zap,
  EXPERIENCE: Briefcase,
  EDUCATION: GraduationCap,
  LANGUAGES: Globe,
  PORTFOLIO: Folder,
  CUSTOM: Star,
};

const FONT = "var(--font-onest), system-ui, sans-serif";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold text-[#6D6A63] uppercase tracking-wider">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full text-[13px] text-[#0A0909] bg-white border border-[#E8E5DD] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF6A3D] focus:ring-2 focus:ring-[#FF6A3D]/15 transition-all placeholder:text-[#9B9891]"
    />
  );
}

function CheckboxRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-[12.5px] text-[#4A4843] cursor-pointer bg-[#FAFAF8] border border-[#E8E5DD] rounded-xl px-3 py-2.5 hover:border-[#FFD4B5] transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-[#FF6A3D]"
      />
      <span className="leading-snug">{children}</span>
    </label>
  );
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
      <FieldLabel>{label}</FieldLabel>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1 bg-gradient-to-br from-[#FFF0E4] to-[#FFE1CB] border border-[#FFD4B5] text-[#9A3412] text-[11px] px-2.5 py-1 rounded-lg font-semibold"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-[#B91C1C] transition-colors"
                aria-label={`Eliminar ${v}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? "Escribí y presioná Enter"}
          className="flex-1 text-[13px] text-[#0A0909] bg-white border border-[#E8E5DD] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#FF6A3D] focus:ring-2 focus:ring-[#FF6A3D]/15 transition-all placeholder:text-[#9B9891]"
        />
        <button
          type="button"
          onClick={add}
          className="p-2.5 bg-[#FFF0E4] text-[#C2410C] border border-[#FFD4B5] rounded-xl hover:bg-gradient-to-br hover:from-[#FF6A3D] hover:to-[#C2410C] hover:text-white hover:border-transparent transition-all"
          aria-label="Agregar"
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

  const Icon = ICON_BY_TYPE[module.type] ?? Star;

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
              label="Skills requeridas (descalifica si faltan con hard filter)"
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
            <CheckboxRow
              checked={(params.hardFilter as boolean) ?? false}
              onChange={(v) => updateParam("hardFilter", v)}
            >
              Hard filter: descalificar si falta una skill requerida
            </CheckboxRow>
          </>
        );
      case "EXPERIENCE":
        return (
          <>
            <div>
              <FieldLabel>Años mínimos de experiencia</FieldLabel>
              <div className="mt-1.5">
                <TextInput
                  type="number"
                  min={0}
                  max={30}
                  value={(params.minYears as number) ?? 0}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    updateParam("minYears", isNaN(raw) ? 0 : raw);
                  }}
                />
              </div>
            </div>
            <TagInput
              label="Roles preferidos"
              values={(params.preferredRoles as string[]) ?? []}
              onChange={(v) => updateParam("preferredRoles", v)}
              placeholder="ej: developer, analyst"
            />
            <CheckboxRow
              checked={(params.hardFilter as boolean) ?? false}
              onChange={(v) => updateParam("hardFilter", v)}
            >
              Hard filter: descalificar si tiene menos años de experiencia
            </CheckboxRow>
          </>
        );
      case "EDUCATION":
        return (
          <>
            <div>
              <FieldLabel>Promedio mínimo (0 = sin requisito)</FieldLabel>
              <div className="mt-1.5">
                <TextInput
                  type="number"
                  min={0}
                  max={7}
                  step={0.1}
                  value={(params.minGPA as number) ?? 0}
                  onChange={(e) =>
                    updateParam("minGPA", parseFloat(e.target.value))
                  }
                />
              </div>
            </div>
            <TagInput
              label="Carreras preferidas"
              values={(params.preferredDegrees as string[]) ?? []}
              onChange={(v) => updateParam("preferredDegrees", v)}
              placeholder="ej: Ingeniería, Computer Science"
            />
            <CheckboxRow
              checked={(params.hardFilter as boolean) ?? false}
              onChange={(v) => updateParam("hardFilter", v)}
            >
              Hard filter: descalificar si promedio es menor al mínimo
            </CheckboxRow>
          </>
        );
      case "LANGUAGES":
        return (
          <>
            <TagInput
              label="Idiomas requeridos"
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
            <CheckboxRow
              checked={(params.hardFilter as boolean) ?? false}
              onChange={(v) => updateParam("hardFilter", v)}
            >
              Hard filter: descalificar si no cumple idioma requerido
            </CheckboxRow>
          </>
        );
      case "PORTFOLIO":
        return (
          <>
            <CheckboxRow
              checked={(params.required as boolean) ?? false}
              onChange={(v) => updateParam("required", v)}
            >
              Portafolio requerido
            </CheckboxRow>
            <TagInput
              label="Palabras clave a detectar"
              values={(params.keywords as string[]) ?? []}
              onChange={(v) => updateParam("keywords", v)}
              placeholder="ej: github, behance, portfolio"
            />
            <CheckboxRow
              checked={(params.hardFilter as boolean) ?? false}
              onChange={(v) => updateParam("hardFilter", v)}
            >
              Hard filter: descalificar si no tiene portafolio
            </CheckboxRow>
          </>
        );
      case "CUSTOM":
        return (
          <div className="bg-[#FAFAF8] border border-[#E8E5DD] rounded-xl p-3.5">
            <p className="text-[12.5px] text-[#6D6A63] leading-relaxed">
              Los módulos personalizados se puntúan manualmente en el dashboard
              de candidatos.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ fontFamily: FONT }}
    >
      <div
        className="absolute inset-0 bg-[#0A0909]/50 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-[24px] shadow-[0_24px_64px_-16px_rgba(20,15,10,0.25)] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-[#E8E5DD]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFF0E4] to-[#FFE1CB] border border-[#FFD4B5] flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-[#C2410C]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-[#9B9891] uppercase tracking-wider">
                Editar módulo
              </p>
              <h2 className="text-[16px] font-extrabold text-[#0A0909] tracking-tight truncate">
                {label}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6D6A63] hover:text-[#0A0909] hover:bg-[#F5F4F1] rounded-xl transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {module.type === "CUSTOM" && (
            <div>
              <FieldLabel>Nombre del módulo</FieldLabel>
              <div className="mt-1.5">
                <TextInput
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
          )}
          {renderFields()}
        </div>

        <div className="px-6 py-4 border-t border-[#E8E5DD] flex justify-end gap-2 bg-[#FAFAF8]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[13px] font-semibold text-[#4A4843] hover:text-[#0A0909] hover:bg-white border border-transparent hover:border-[#E8E5DD] rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] text-white text-[13px] font-bold rounded-xl shadow-md shadow-[#FF6A3D]/20 hover:shadow-lg hover:shadow-[#FF6A3D]/30 hover:-translate-y-0.5 transition-all"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
