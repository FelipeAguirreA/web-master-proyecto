"use client";

import type { ReactNode } from "react";
import { D } from "../dashboard/tokens";
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
    <section
      style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 18,
        padding: "20px 22px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.3,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h2>
        {editing && onSave && onCancel ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: `1px solid ${D.border}`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: D.muted,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{
                padding: "6px 12px",
                background: `linear-gradient(135deg,${D.accent},${D.accentHi})`,
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow: `0 4px 12px ${D.accent}45`,
              }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        ) : (
          onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="practix-block-edit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 11px",
                background: "transparent",
                border: "none",
                color: D.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                borderRadius: 7,
              }}
            >
              <Icon name="plus" size={12} color="currentColor" />
              Editar
            </button>
          )
        )}
      </header>
      {children}
      <style>{`
        .practix-block-edit:hover { background: rgba(0,0,0,.04); color: ${D.text}; }
      `}</style>
    </section>
  );
}
