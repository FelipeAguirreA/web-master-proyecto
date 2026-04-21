"use client";

import {
  GripVertical,
  Pencil,
  X,
  Zap,
  Briefcase,
  GraduationCap,
  Globe,
  Folder,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ATSModuleState {
  id?: string;
  type: string;
  label: string;
  icon: string;
  isActive: boolean;
  weight: number;
  order: number;
  params: Record<string, unknown>;
}

interface ModuleCardProps {
  module: ATSModuleState;
  draggable?: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onWeightChange: (weight: number) => void;
}

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  SKILLS: Zap,
  EXPERIENCE: Briefcase,
  EDUCATION: GraduationCap,
  LANGUAGES: Globe,
  PORTFOLIO: Folder,
  CUSTOM: Star,
};

export default function ModuleCard({
  module,
  onEdit,
  onDeactivate,
  onWeightChange,
}: ModuleCardProps) {
  const Icon = ICON_BY_TYPE[module.type] ?? Star;

  return (
    <div className="bg-white border border-[#E8E5DD] rounded-[16px] p-4 flex items-center gap-3 shadow-sm hover:border-[#FFD4B5] transition-colors">
      <GripVertical className="w-4 h-4 text-[#C9C6BF] cursor-grab flex-shrink-0" />

      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFF0E4] to-[#FFE1CB] border border-[#FFD4B5] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#C2410C]" strokeWidth={2.2} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#0A0909] truncate tracking-tight">
          {module.label}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="range"
            min={0}
            max={100}
            value={module.weight}
            onChange={(e) => onWeightChange(Number(e.target.value))}
            className="flex-1 h-1.5 accent-[#FF6A3D]"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={module.weight}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onWeightChange(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
            }}
            className="w-14 text-xs font-bold text-[#C2410C] text-right border border-[#E8E5DD] rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#FF6A3D] focus:ring-2 focus:ring-[#FF6A3D]/15 tabular-nums"
          />
          <span className="text-xs font-bold text-[#9B9891]">%</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-[#9B9891] hover:text-[#C2410C] hover:bg-[#FFF4EE] rounded-lg transition-colors"
          title="Editar módulo"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDeactivate}
          className="p-1.5 text-[#9B9891] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"
          title="Desactivar módulo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
