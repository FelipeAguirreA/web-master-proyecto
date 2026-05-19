"use client";

import { useState } from "react";
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="perfil-university">Universidad</FieldLabel>
            <input
              id="perfil-university"
              name="university"
              type="text"
              autoComplete="organization"
              aria-label="Universidad"
              value={uni}
              onChange={(e) => setUni(e.target.value)}
              placeholder="Ej: PUC, U. de Chile, USACH…"
              maxLength={120}
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13.5px] text-text bg-bg font-[inherit] outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <FieldLabel htmlFor="perfil-career">Carrera</FieldLabel>
            <input
              id="perfil-career"
              name="career"
              type="text"
              aria-label="Carrera"
              value={carr}
              onChange={(e) => setCarr(e.target.value)}
              placeholder="Ing. Comercial, Derecho, Diseño…"
              maxLength={120}
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13.5px] text-text bg-bg font-[inherit] outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <FieldLabel htmlFor="perfil-semester">Semestre actual</FieldLabel>
            <input
              id="perfil-semester"
              name="semester"
              type="number"
              aria-label="Semestre actual"
              min={1}
              max={20}
              value={sem}
              onChange={(e) => setSem(e.target.value)}
              placeholder="7"
              className="w-full px-3 py-2.5 border border-border rounded-[10px] text-[13.5px] text-text bg-bg font-[inherit] outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      ) : university || career || semester ? (
        <div className="grid grid-cols-[auto_1fr] gap-3.5">
          <span className="w-10 h-10 rounded-[10px] bg-black/5 text-muted flex items-center justify-center shrink-0">
            <Icon name="doc" size={18} color="var(--color-muted)" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-text leading-[1.3]">
              {career || "Carrera por completar"}
            </h3>
            <p className="text-[12.5px] text-muted font-semibold mt-[3px]">
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
        <p className="text-[13.5px] text-subtle leading-[1.65] italic">
          Aún no has agregado tu información educativa. Click en
          &ldquo;Editar&rdquo; para completarla.
        </p>
      )}
    </Block>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[10.5px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-1.5"
    >
      {children}
    </label>
  );
}
