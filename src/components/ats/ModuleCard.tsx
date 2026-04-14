"use client";

import { GripVertical, Pencil, X } from "lucide-react";

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

export default function ModuleCard({
  module,
  onEdit,
  onDeactivate,
  onWeightChange,
}: ModuleCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />

      <span className="text-xl flex-shrink-0">{module.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">
          {module.label}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="range"
            min={0}
            max={100}
            value={module.weight}
            onChange={(e) => onWeightChange(Number(e.target.value))}
            className="flex-1 h-1.5 accent-brand-600"
          />
          <span className="text-xs font-bold text-brand-600 w-8 text-right">
            {module.weight}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          title="Editar módulo"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDeactivate}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Desactivar módulo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
