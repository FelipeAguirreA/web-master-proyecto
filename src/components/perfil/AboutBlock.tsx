"use client";

import { useState } from "react";
import { D } from "../dashboard/tokens";
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
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Contá quién sos, qué te apasiona, qué buscás…"
          style={{
            width: "100%",
            padding: "12px 14px",
            border: `1px solid ${D.border}`,
            borderRadius: 12,
            fontSize: 13.5,
            color: D.text,
            background: D.bg,
            fontFamily: "inherit",
            lineHeight: 1.6,
            resize: "vertical",
            minHeight: 100,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = D.accent;
            e.currentTarget.style.background = D.surface;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = D.border;
            e.currentTarget.style.background = D.bg;
          }}
        />
      ) : bio ? (
        <p
          style={{
            fontSize: 13.5,
            color: D.muted,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
          }}
        >
          {bio}
        </p>
      ) : (
        <p
          style={{
            fontSize: 13.5,
            color: D.subtle,
            lineHeight: 1.65,
            fontStyle: "italic",
          }}
        >
          Aún no has escrito tu bio. Click en &ldquo;Editar&rdquo; para
          agregarla.
        </p>
      )}
    </Block>
  );
}
