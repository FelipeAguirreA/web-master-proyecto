"use client";

import { useState } from "react";
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
          {/* Tag input container */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border border-border rounded-xl bg-bg mb-1.5 min-h-[50px] items-center">
            {draft.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-[5px] bg-accent-bg text-accent text-[12.5px] font-bold pl-2.5 pr-2 py-1 rounded-[7px] border border-accent-bdr"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="bg-transparent border-none cursor-pointer p-0 inline-flex items-center text-accent"
                  aria-label={`Quitar ${s}`}
                >
                  <Icon name="x" size={11} color="currentColor" />
                </button>
              </span>
            ))}
            <input
              id="perfil-skill-input"
              name="skill"
              type="text"
              aria-label="Agregar skill"
              autoComplete="off"
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
                  ? "Escribe una skill y dale Enter…"
                  : "Agregar…"
              }
              className="flex-1 min-w-[140px] border-none outline-none bg-transparent text-[13px] text-text font-[inherit] px-1 py-[2px]"
            />
          </div>
          <p className="text-[11.5px] text-subtle mb-3">
            Cada coma o Enter agrega una skill nueva.
          </p>
          {visibleSuggestions.length > 0 && (
            <div>
              <p className="text-[10.5px] font-extrabold text-subtle tracking-[0.6px] uppercase mb-2">
                Sugerencias de tu CV
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-[5px] bg-surface text-muted text-xs font-semibold px-[9px] py-1 rounded-[7px] border border-dashed border-border cursor-pointer font-[inherit] hover:bg-bg hover:text-text transition-colors"
                  >
                    <Icon name="plus" size={11} color="currentColor" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center text-[12.5px] font-bold text-accent bg-accent-bg px-2.5 py-[5px] rounded-lg border border-accent-bdr"
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] text-subtle leading-[1.65] italic">
          {suggestions.length > 0
            ? "Detectamos algunas skills en tu CV. Click en “Editar” para revisarlas."
            : "Aún no has agregado skills. Click en “Editar” o subí tu CV para que las sugiramos."}
        </p>
      )}
    </Block>
  );
}
