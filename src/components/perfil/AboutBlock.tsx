"use client";

import { useState } from "react";
import { Block } from "./Block";

type Props = {
  bio: string | null;
  onSave: (bio: string) => Promise<void>;
};

export function AboutBlock({ bio, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(bio ?? "");
    setEditing(false);
  };

  return (
    <Block
      title="Sobre mí"
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
    >
      {editing ? (
        <textarea
          id="perfil-bio"
          name="bio"
          aria-label="Sobre ti"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Contá quién sos, qué te apasiona, qué buscás…"
          className="w-full px-3.5 py-3 border border-border rounded-xl text-[13.5px] text-text bg-bg font-[inherit] leading-relaxed resize-y min-h-[100px] outline-none focus:border-accent focus:bg-surface transition-colors"
        />
      ) : bio ? (
        <p className="text-[13.5px] text-muted leading-[1.65] whitespace-pre-wrap">
          {bio}
        </p>
      ) : (
        <p className="text-[13.5px] text-subtle leading-[1.65] italic">
          Aún no has escrito tu bio. Click en &ldquo;Editar&rdquo; para
          agregarla.
        </p>
      )}
    </Block>
  );
}
