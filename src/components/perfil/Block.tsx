"use client";

import type { ReactNode } from "react";
import { Icon } from "../dashboard/Icon";

type Props = {
  title: string;
  editing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  saving?: boolean;
  children: ReactNode;
};

export function Block({
  title,
  editing = false,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  children,
}: Props) {
  return (
    <section className="bg-surface border border-border rounded-[18px] p-4 sm:p-5 md:p-[22px]">
      <header className="flex items-center justify-between mb-3.5 gap-2.5">
        <h2 className="text-[15px] font-extrabold text-text tracking-[-0.3px] whitespace-nowrap">
          {title}
        </h2>
        {editing && onSave && onCancel ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 bg-transparent border border-border rounded-lg text-xs font-bold text-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1.5 bg-gradient-to-br from-accent to-accent-hi border-none rounded-lg text-xs font-bold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 shadow-[0_4px_12px_color-mix(in_srgb,var(--color-accent)_27%,transparent)]"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        ) : (
          onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-[5px] px-[11px] py-1.5 bg-transparent border-none text-muted text-xs font-bold cursor-pointer rounded-[7px] hover:bg-black/[0.04] hover:text-text transition-colors"
            >
              <Icon name="plus" size={12} color="currentColor" />
              Editar
            </button>
          )
        )}
      </header>
      {children}
    </section>
  );
}
