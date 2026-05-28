"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../dashboard/Icon";
import { ScoreVis } from "../dashboard/atoms/ScoreVis";

type Props = {
  cvUrl: string | null;
  cvPct: number;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
};

const ACCEPTED = ".pdf,.docx";

export function CVUploadCard({ cvUrl, cvPct, onUpload, onDelete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateAndUpload = async (file: File) => {
    setError(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setError("Solo PDF o DOCX.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB.");
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el CV.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar tu CV?")) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el CV.");
    } finally {
      setBusy(false);
    }
  };

  // El botón "Cargar el CV" del sidebar emite este evento cuando el user ya
  // está en /perfil — en lugar de navegar, abrimos el file picker directo.
  // Sirve tanto para subir por primera vez como para reemplazar.
  useEffect(() => {
    function openPicker() {
      if (busy) return;
      fileRef.current?.click();
    }
    window.addEventListener("practix:cv-open-picker", openPicker);
    return () =>
      window.removeEventListener("practix:cv-open-picker", openPicker);
  }, [busy]);

  return (
    <section className="bg-gradient-to-br from-cream to-white border border-accent-bdr rounded-[18px] p-4 sm:p-[18px] relative overflow-hidden">
      {/* Decorative radial blob */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 15%, transparent), transparent 65%)",
        }}
      />

      <div className="relative">
        {/* Header: score ring + status text */}
        <div className="flex items-center gap-3.5 mb-3.5">
          <ScoreVis score={cvPct} style="ring" size={66} label={false} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[13.5px] font-extrabold text-text">
              {cvUrl ? "CV subido" : "Sin CV"}
            </h3>
            <p className="text-[11.5px] text-muted leading-[1.45] mt-0.5">
              {cvUrl
                ? "Tu CV está activo. Lo usamos para hacer match con prácticas."
                : "Sube un PDF o DOCX. Lo procesamos en menos de 5 segundos."}
            </p>
          </div>
        </div>

        {!cvUrl ? (
          /* Drop zone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) validateAndUpload(file);
            }}
            onClick={() => !busy && fileRef.current?.click()}
            className={[
              "border-2 border-dashed rounded-xl px-4 py-5 text-center transition-all duration-200 min-h-[44px]",
              busy ? "cursor-wait" : "cursor-pointer",
              dragOver
                ? "border-accent bg-accent-bg"
                : "border-border bg-white/50 hover:border-accent-hi hover:bg-accent-bg/40",
            ].join(" ")}
          >
            <Icon
              name="cv"
              size={28}
              color={dragOver ? "var(--color-accent)" : "var(--color-muted)"}
            />
            <p className="text-[13px] font-bold text-text mt-2">
              {busy
                ? "Procesando…"
                : dragOver
                  ? "Suelta el archivo"
                  : "Arrastra o haz clic para subir"}
            </p>
            <p className="text-[11px] text-subtle mt-1">
              PDF o DOCX · Máx 5 MB
            </p>
          </div>
        ) : (
          /* Actions when CV exists */
          <div className="flex gap-2">
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-text text-white px-3.5 py-2.5 rounded-[11px] text-[12.5px] font-bold no-underline min-h-[44px] inline-flex items-center justify-center"
            >
              Ver CV
            </a>
            <button
              type="button"
              onClick={() => !busy && fileRef.current?.click()}
              disabled={busy}
              className="flex-1 bg-gradient-to-br from-accent to-accent-hi text-white px-3.5 py-2.5 rounded-[11px] text-[12.5px] font-bold border-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 min-h-[44px] shadow-[0_4px_12px_color-mix(in_srgb,var(--color-accent)_27%,transparent)]"
            >
              {busy ? "…" : "Reemplazar"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="w-[38px] min-h-[44px] bg-transparent text-rose px-2.5 rounded-[11px] border border-rose/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center"
              title="Eliminar CV"
              aria-label="Eliminar CV"
            >
              <Icon name="x" size={14} color="var(--color-rose)" />
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-[11.5px] text-rose mt-2.5 px-2.5 py-2 bg-rose-bg rounded-lg border border-rose/15">
            {error}
          </p>
        )}

        {/* Hidden file input — accept preserved */}
        <input
          ref={fileRef}
          id="perfil-cv-upload"
          name="cv"
          type="file"
          accept={ACCEPTED}
          aria-label="Subir CV"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndUpload(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>
    </section>
  );
}
