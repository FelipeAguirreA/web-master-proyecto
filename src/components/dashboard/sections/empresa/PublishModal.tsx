import type { FormEvent } from "react";
import { Icon } from "@/components/dashboard/Icon";
import { AREAS, MODALITIES, type EmpForm } from "./types";

type PublishModalProps = {
  form: EmpForm;
  formErrors: Partial<Record<keyof EmpForm, string>>;
  submitting: boolean;
  onChange: (key: keyof EmpForm, value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  /** "create" (default) o "edit" — cambia copy del header y del CTA. */
  mode?: "create" | "edit";
  /** Error global del backend (ej. 409 si ya hay postulantes). */
  globalError?: string | null;
};

/** Clases base del input/select/textarea. Se separan errores con una variante. */
const inputBase =
  "w-full rounded-[11px] px-3.5 py-2.5 text-[13.5px] text-text font-[inherit] transition-all duration-150";
const inputNormal = `${inputBase} bg-black/[0.04] border border-transparent`;
const inputError = `${inputBase} bg-rose/[0.06] border border-rose`;

const labelCls =
  "block text-[11px] font-bold tracking-[0.96px] uppercase text-muted mb-1.5";
const errCls = "text-[11.5px] text-rose mt-1 font-semibold";

export function PublishModal({
  form,
  formErrors,
  submitting,
  onChange,
  onClose,
  onSubmit,
  mode = "create",
  globalError = null,
}: PublishModalProps) {
  const isEdit = mode === "edit";
  const chipText = isEdit ? "Editar práctica" : "Nueva práctica";
  const titleText = isEdit ? "Editá tu vacante" : "Publica una vacante";
  const submitText = isEdit
    ? submitting
      ? "Guardando…"
      : "Guardar cambios"
    : submitting
      ? "Publicando…"
      : "Publicar práctica";
  return (
    /* Backdrop — mobile: items-end (bottom sheet), sm+: items-center */
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-[rgba(11,27,63,.55)] backdrop-blur-[4px]
                 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          "bg-white w-full overflow-y-auto",
          "max-h-[calc(100dvh-80px)] sm:max-h-[90vh]",
          "rounded-t-[24px] sm:rounded-[24px] rounded-b-none sm:rounded-b-[24px]",
          "max-w-[540px]",
          "shadow-[0_24px_64px_-12px_rgba(11,27,63,.4)]",
        ].join(" ")}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-[8px] border-b border-border px-5 sm:px-6 py-4 flex justify-between items-center z-10">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.96px] uppercase text-accent">
              {chipText}
            </p>
            <h2 className="text-[17px] font-extrabold text-text mt-0.5 tracking-[-0.3px]">
              {titleText}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            /* min 44x44 px para touch target */
            className="w-11 h-11 rounded-full bg-transparent border-none cursor-pointer inline-flex items-center justify-center text-muted"
          >
            <Icon name="x" size={16} color="var(--color-muted)" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          noValidate
          className="px-5 sm:px-6 py-5 grid gap-3.5"
        >
          {/* Título */}
          <div>
            <label htmlFor="emp-title" className={labelCls}>
              Título *
            </label>
            <input
              id="emp-title"
              type="text"
              placeholder="Ej: Practicante Frontend Developer"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              className={formErrors.title ? inputError : inputNormal}
            />
            {formErrors.title && <p className={errCls}>{formErrors.title}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="emp-description" className={labelCls}>
              Descripción *
            </label>
            <textarea
              id="emp-description"
              rows={4}
              placeholder="Describe el contexto del puesto, el equipo y el impacto."
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              className={`${formErrors.description ? inputError : inputNormal} resize-y leading-relaxed`}
            />
            {formErrors.description && (
              <p className={errCls}>{formErrors.description}</p>
            )}
          </div>

          {/* Área + Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="emp-area" className={labelCls}>
                Área
              </label>
              <select
                id="emp-area"
                value={form.area}
                onChange={(e) => onChange("area", e.target.value)}
                className={inputNormal}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="emp-modality" className={labelCls}>
                Modalidad
              </label>
              <select
                id="emp-modality"
                value={form.modality}
                onChange={(e) => onChange("modality", e.target.value)}
                className={inputNormal}
              >
                {MODALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ubicación + Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="emp-location" className={labelCls}>
                Ubicación *
              </label>
              <input
                id="emp-location"
                type="text"
                placeholder="Santiago"
                value={form.location}
                onChange={(e) => onChange("location", e.target.value)}
                className={formErrors.location ? inputError : inputNormal}
              />
              {formErrors.location && (
                <p className={errCls}>{formErrors.location}</p>
              )}
            </div>
            <div>
              <label htmlFor="emp-duration" className={labelCls}>
                Duración *
              </label>
              <input
                id="emp-duration"
                type="text"
                placeholder="3 meses"
                value={form.duration}
                onChange={(e) => onChange("duration", e.target.value)}
                className={formErrors.duration ? inputError : inputNormal}
              />
              {formErrors.duration && (
                <p className={errCls}>{formErrors.duration}</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label htmlFor="emp-skills" className={labelCls}>
              Skills *
            </label>
            <input
              id="emp-skills"
              type="text"
              placeholder="React, TypeScript, Node.js"
              value={form.skills}
              onChange={(e) => onChange("skills", e.target.value)}
              className={formErrors.skills ? inputError : inputNormal}
            />
            <p className="text-[11px] text-subtle mt-1">Separa con comas.</p>
            {formErrors.skills && <p className={errCls}>{formErrors.skills}</p>}
          </div>

          {/* Responsabilidades */}
          <div>
            <label htmlFor="emp-resp" className={labelCls}>
              Lo que harás
            </label>
            <textarea
              id="emp-resp"
              rows={5}
              placeholder={
                "Diseñar dashboards en Looker para 3 squads\nEscribir queries SQL sobre el data warehouse\nHacer análisis ad-hoc (A/B tests, cohortes)\nPresentar hallazgos semanales a PMs\nDocumentar metodologías en Notion"
              }
              value={form.responsibilities}
              onChange={(e) => onChange("responsibilities", e.target.value)}
              className={`${inputNormal} resize-y leading-relaxed`}
            />
            <p className="text-[11px] text-subtle mt-1 leading-relaxed">
              Una tarea por línea. Aparece como lista numerada en el detalle.
              Opcional pero recomendado.
            </p>
          </div>

          {/* Requisitos */}
          <div>
            <label htmlFor="emp-req" className={labelCls}>
              Requisitos *
            </label>
            <input
              id="emp-req"
              type="text"
              placeholder="Estudiante Ing. Informática, 4to año+"
              value={form.requirements}
              onChange={(e) => onChange("requirements", e.target.value)}
              className={formErrors.requirements ? inputError : inputNormal}
            />
            {formErrors.requirements && (
              <p className={errCls}>{formErrors.requirements}</p>
            )}
          </div>

          {/* Error global (ej. 409 APPLICATIONS_EXIST) */}
          {globalError && (
            <div className="px-3.5 py-3 bg-rose-bg border border-rose/30 rounded-[10px] text-[12.5px] text-rose font-semibold leading-relaxed">
              {globalError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={[
              "w-full py-3 rounded-[12px]",
              "bg-gradient-to-br from-accent to-accent-hi text-white",
              "text-[13.5px] font-extrabold border-none",
              "shadow-[0_6px_18px_color-mix(in_srgb,var(--color-accent)_27%,transparent)]",
              "inline-flex items-center justify-center gap-2",
              submitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {submitText}
          </button>
        </form>
      </div>
    </div>
  );
}
