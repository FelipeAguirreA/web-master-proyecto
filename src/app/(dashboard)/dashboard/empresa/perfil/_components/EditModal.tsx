"use client";

import { useState } from "react";
import type { CompanyProfile } from "./types";

/* ─────────────────────────── Field ─────────────────────────── */

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-extrabold text-subtle tracking-[0.4px] uppercase">
        {label}
      </span>
      <input
        id={name}
        name={name}
        type={type ?? "text"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          "w-full h-11 px-3 py-2.5 text-base sm:text-[13.5px]",
          "border border-border rounded-[9px]",
          "text-text bg-bg font-[inherit]",
          "outline-none focus:border-accent focus:ring-1 focus:ring-accent/25",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "transition-colors",
        ].join(" ")}
      />
    </label>
  );
}

/* ─────────────────────────── Textarea ──────────────────────── */

function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label htmlFor={name} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-extrabold text-subtle tracking-[0.4px] uppercase">
        {label}
      </span>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) =>
          maxLength
            ? onChange(e.target.value.slice(0, maxLength))
            : onChange(e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        className={[
          "w-full px-3 py-2.5 text-base sm:text-[13.5px]",
          "border border-border rounded-[9px]",
          "text-text bg-bg font-[inherit]",
          "outline-none focus:border-accent focus:ring-1 focus:ring-accent/25",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "resize-y transition-colors",
        ].join(" ")}
      />
      {maxLength && (
        <span className="text-[11px] text-subtle self-end">
          {value.length} / {maxLength}
        </span>
      )}
    </label>
  );
}

/* ─────────────────────────── EditModal ─────────────────────── */

type SaveValues = {
  companyName: string;
  industry: string;
  website: string;
  description: string;
};

type Props = {
  initial: CompanyProfile;
  onClose: () => void;
  onSave: (values: SaveValues) => void;
  saving: boolean;
  error: string | null;
};

export function EditModal({ initial, onClose, onSave, saving, error }: Props) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [industry, setIndustry] = useState(initial.industry ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  const canSave = !saving && companyName.trim().length >= 2;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 bg-dark/55 z-[70]"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-perfil-empresa-title"
        className={[
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[min(560px,94vw)] max-h-[90vh] overflow-auto",
          "bg-surface rounded-2xl z-[71]",
          "px-4 py-5 sm:px-6 sm:py-[22px]",
          "shadow-[0_24px_64px_rgba(11,27,63,.24)]",
        ].join(" ")}
      >
        <h3
          id="edit-perfil-empresa-title"
          className="text-[17px] font-extrabold text-text tracking-[-0.3px] m-0"
        >
          Editar perfil de empresa
        </h3>
        <p className="text-[13px] text-muted mt-1.5 leading-[1.5]">
          Esta información es lo que ven los estudiantes cuando entran a tu
          perfil.
        </p>

        <div className="mt-[18px] flex flex-col gap-3.5">
          <Field
            label="Nombre de la empresa *"
            name="companyName"
            autoComplete="organization"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Ej: Lumen Retail"
            disabled={saving}
          />
          <Field
            label="Industria"
            name="industry"
            value={industry}
            onChange={setIndustry}
            placeholder="Ej: Retail · Omnicanal"
            disabled={saving}
          />
          <Field
            label="Sitio web"
            name="website"
            type="url"
            autoComplete="url"
            value={website}
            onChange={setWebsite}
            placeholder="tu-empresa.cl"
            disabled={saving}
          />
          <Textarea
            label="Sobre nosotros"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Cuéntale al mundo qué hace tu empresa, cómo trabajan los practicantes, qué cultura tienen…"
            disabled={saving}
            maxLength={1000}
          />
        </div>

        {error && (
          <p className="mt-3 px-3 py-2.5 bg-rose-bg text-rose rounded-lg text-[13px] border border-rose/20">
            {error}
          </p>
        )}

        <div className="mt-[18px] flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] px-3.5 py-2.5 bg-surface border border-border text-text rounded-[9px] text-[12.5px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark/[0.04] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              const rawWebsite = website.trim();
              const normalizedWebsite =
                rawWebsite && !rawWebsite.match(/^https?:\/\//)
                  ? `https://${rawWebsite}`
                  : rawWebsite;
              onSave({
                companyName: companyName.trim(),
                industry: industry.trim(),
                website: normalizedWebsite,
                description: description.trim(),
              });
            }}
            disabled={!canSave}
            className="min-h-[44px] px-3.5 py-2.5 bg-gradient-to-br from-accent to-accent-hi text-white border-none rounded-[9px] text-[12.5px] font-extrabold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_14px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] transition-opacity"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
