"use client";

import { useState } from "react";
import { D } from "../dashboard/tokens";
import { Icon } from "../dashboard/Icon";
import { Block } from "./Block";

type Props = {
  skills: string[];
  suggestions: string[];
  onSave: (skills: string[]) => Promise<void>;
};

export function SkillsBlock({ skills, suggestions, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(skills);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const addSkill = (s: string) => {
    const clean = s.trim();
    if (!clean) return;
    if (draft.includes(clean)) return;
    if (draft.length >= 60) return;
    setDraft([...draft, clean]);
  };

  const removeSkill = (s: string) => {
    setDraft(draft.filter((x) => x !== s));
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(input);
      setInput("");
    } else if (e.key === "Backspace" && input === "" && draft.length > 0) {
      setDraft(draft.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      setInput("");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(skills);
    setInput("");
    setEditing(false);
  };

  const visibleSuggestions = suggestions.filter((s) => !draft.includes(s));

  return (
    <Block
      title="Skills"
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
    >
      {editing ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "10px 12px",
              border: `1px solid ${D.border}`,
              borderRadius: 12,
              background: D.bg,
              marginBottom: 12,
              minHeight: 50,
              alignItems: "center",
            }}
          >
            {draft.map((s) => (
              <span
                key={s}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: D.accentBg,
                  color: D.accent,
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "4px 8px 4px 10px",
                  borderRadius: 7,
                  border: `1px solid ${D.accentBdr}`,
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    color: D.accent,
                  }}
                  aria-label={`Quitar ${s}`}
                >
                  <Icon name="x" size={11} color="currentColor" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKey}
              onBlur={() => {
                if (input.trim()) {
                  addSkill(input);
                  setInput("");
                }
              }}
              placeholder={
                draft.length === 0
                  ? "Escribí una skill y dale Enter…"
                  : "Agregar…"
              }
              style={{
                flex: 1,
                minWidth: 140,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
                color: D.text,
                fontFamily: "inherit",
                padding: "2px 4px",
              }}
            />
          </div>
          {visibleSuggestions.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: D.subtle,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Sugerencias de tu CV
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {visibleSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: D.surface,
                      color: D.muted,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 9px",
                      borderRadius: 7,
                      border: `1px dashed ${D.border}`,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Icon name="plus" size={11} color={D.muted} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : skills.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {skills.map((s) => (
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12.5,
                fontWeight: 700,
                color: D.accent,
                background: D.accentBg,
                padding: "5px 10px",
                borderRadius: 8,
                border: `1px solid ${D.accentBdr}`,
              }}
            >
              {s}
            </span>
          ))}
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
          {suggestions.length > 0
            ? "Detectamos algunas skills en tu CV. Click en “Editar” para revisarlas."
            : "Aún no has agregado skills. Click en “Editar” o subí tu CV para que las sugiramos."}
        </p>
      )}
    </Block>
  );
}
