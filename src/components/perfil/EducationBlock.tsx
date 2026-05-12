"use client";

import { useState } from "react";
import { D } from "../dashboard/tokens";
import { Icon } from "../dashboard/Icon";
import { Block } from "./Block";

type Props = {
  university: string | null;
  career: string | null;
  semester: number | null;
  onSave: (data: {
    university: string | null;
    career: string | null;
    semester: number | null;
  }) => Promise<void>;
};

const INPUT_STYLE = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  fontSize: 13.5,
  color: D.text,
  background: D.bg,
  fontFamily: "inherit",
  outline: "none",
} as const;

export function EducationBlock({
  university,
  career,
  semester,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [uni, setUni] = useState(university ?? "");
  const [carr, setCarr] = useState(career ?? "");
  const [sem, setSem] = useState<string>(semester ? String(semester) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const semNum = sem.trim() ? parseInt(sem.trim(), 10) : null;
      await onSave({
        university: uni.trim() || null,
        career: carr.trim() || null,
        semester:
          semNum && !Number.isNaN(semNum) && semNum >= 1 && semNum <= 20
            ? semNum
            : null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUni(university ?? "");
    setCarr(career ?? "");
    setSem(semester ? String(semester) : "");
    setEditing(false);
  };

  return (
    <Block
      title="Educación"
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
    >
      {editing ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Universidad</FieldLabel>
            <input
              type="text"
              value={uni}
              onChange={(e) => setUni(e.target.value)}
              placeholder="Ej: PUC, U. de Chile, USACH…"
              maxLength={120}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <FieldLabel>Carrera</FieldLabel>
            <input
              type="text"
              value={carr}
              onChange={(e) => setCarr(e.target.value)}
              placeholder="Ing. Comercial, Derecho, Diseño…"
              maxLength={120}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <FieldLabel>Semestre actual</FieldLabel>
            <input
              type="number"
              min={1}
              max={20}
              value={sem}
              onChange={(e) => setSem(e.target.value)}
              placeholder="7"
              style={INPUT_STYLE}
            />
          </div>
        </div>
      ) : university || career || semester ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 14,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(0,0,0,.05)",
              color: D.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="doc" size={18} color={D.muted} />
          </span>
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: D.text,
                lineHeight: 1.3,
              }}
            >
              {career || "Carrera por completar"}
            </h3>
            <p
              style={{
                fontSize: 12.5,
                color: D.muted,
                fontWeight: 600,
                marginTop: 3,
              }}
            >
              {university || "Universidad por completar"}
              {semester && (
                <>
                  {" · "}
                  {semester}° semestre
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <p
          style={{
            fontSize: 13.5,
            color: D.subtle,
            lineHeight: 1.65,
            fontStyle: "italic",
          }}
        >
          Aún no has agregado tu información educativa. Click en
          &ldquo;Editar&rdquo; para completarla.
        </p>
      )}
    </Block>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 10.5,
        fontWeight: 800,
        color: D.subtle,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}
