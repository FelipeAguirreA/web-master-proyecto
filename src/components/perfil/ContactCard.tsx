"use client";

import { useState } from "react";
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
      <div className="flex flex-col gap-3 text-[12.5px]">
        {/* Email row */}
        <div className="flex gap-[9px] items-center">
          <span className="w-7 h-7 rounded-lg bg-bg inline-flex items-center justify-center shrink-0">
            <Icon name="send" size={13} color="var(--color-muted)" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold text-subtle tracking-[0.5px] uppercase">
              Email
            </div>
            <div className="text-text font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
              {email}
            </div>
          </div>
        </div>

        {/* Phone row */}
        <div className="flex gap-[9px] items-center">
          <span className="w-7 h-7 rounded-lg bg-bg inline-flex items-center justify-center shrink-0">
            <Icon name="bell" size={13} color="var(--color-muted)" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold text-subtle tracking-[0.5px] uppercase">
              Teléfono
            </div>
            {editing ? (
              <input
                id="perfil-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                aria-label="Teléfono"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="+56 9 …"
                maxLength={20}
                className="w-full mt-1 px-2.5 py-1.5 border border-border rounded-lg text-[12.5px] text-text bg-surface font-[inherit] outline-none focus:border-accent transition-colors"
              />
            ) : (
              <div
                className={
                  phone
                    ? "text-text font-semibold"
                    : "text-subtle font-medium italic"
                }
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
