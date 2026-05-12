"use client";

import { useState } from "react";
import { D } from "../dashboard/tokens";
import { Icon } from "../dashboard/Icon";
import { Block } from "./Block";

type Props = {
  email: string;
  phone: string | null;
  onSavePhone: (phone: string) => Promise<void>;
};

export function ContactCard({ email, phone, onSavePhone }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSavePhone(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(phone ?? "");
    setEditing(false);
  };

  return (
    <Block
      title="Contacto"
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          fontSize: 12.5,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: D.bg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="send" size={13} color={D.muted} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: D.subtle,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Email
            </div>
            <div
              style={{
                color: D.text,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {email}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 9,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: D.bg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="bell" size={13} color={D.muted} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: D.subtle,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Teléfono
            </div>
            {editing ? (
              <input
                type="tel"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="+56 9 …"
                maxLength={20}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "6px 10px",
                  border: `1px solid ${D.border}`,
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: D.text,
                  background: D.surface,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            ) : (
              <div
                style={{
                  color: phone ? D.text : D.subtle,
                  fontWeight: phone ? 600 : 500,
                  fontStyle: phone ? "normal" : "italic",
                }}
              >
                {phone || "Sin teléfono"}
              </div>
            )}
          </div>
        </div>
      </div>
    </Block>
  );
}
