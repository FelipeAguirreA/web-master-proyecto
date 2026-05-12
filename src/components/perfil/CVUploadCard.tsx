"use client";

import { useRef, useState } from "react";
import { D } from "../dashboard/tokens";
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

  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${D.cream}, #fff)`,
        border: `1px solid ${D.accentBdr}`,
        borderRadius: 18,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          background: `radial-gradient(circle, ${D.accent}25, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <ScoreVis score={cvPct} style="ring" size={66} label={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: D.text,
              }}
            >
              {cvUrl ? "CV subido" : "Sin CV"}
            </h3>
            <p
              style={{
                fontSize: 11.5,
                color: D.muted,
                lineHeight: 1.45,
                marginTop: 2,
              }}
            >
              {cvUrl
                ? "Tu CV está activo. Lo usamos para hacer match con prácticas."
                : "Sube un PDF o DOCX. Lo procesamos en menos de 5 segundos."}
            </p>
          </div>
        </div>

        {!cvUrl ? (
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
            style={{
              border: `1.5px dashed ${dragOver ? D.accent : D.border}`,
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center",
              background: dragOver ? `${D.accent}08` : "rgba(255,255,255,.5)",
              transition: "all .2s",
              cursor: busy ? "wait" : "pointer",
            }}
            onClick={() => !busy && fileRef.current?.click()}
          >
            <Icon name="cv" size={28} color={dragOver ? D.accent : D.muted} />
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: D.text,
                marginTop: 8,
              }}
            >
              {busy
                ? "Procesando…"
                : dragOver
                  ? "Soltá el archivo"
                  : "Arrastrá o clickeá para subir"}
            </p>
            <p
              style={{
                fontSize: 11,
                color: D.subtle,
                marginTop: 4,
              }}
            >
              PDF o DOCX · Máx 5 MB
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                textAlign: "center",
                background: D.text,
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 11,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ver CV
            </a>
            <button
              type="button"
              onClick={() => !busy && fileRef.current?.click()}
              disabled={busy}
              style={{
                flex: 1,
                background: `linear-gradient(135deg,${D.accent},${D.accentHi})`,
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 11,
                fontSize: 12.5,
                fontWeight: 700,
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: `0 4px 12px ${D.accent}45`,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "…" : "Reemplazar"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              style={{
                width: 38,
                background: "transparent",
                color: D.rose,
                padding: "10px",
                borderRadius: 11,
                border: `1px solid ${D.rose}30`,
                cursor: busy ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: busy ? 0.5 : 1,
              }}
              title="Eliminar CV"
              aria-label="Eliminar CV"
            >
              <Icon name="x" size={14} color={D.rose} />
            </button>
          </div>
        )}

        {error && (
          <p
            style={{
              fontSize: 11.5,
              color: D.rose,
              marginTop: 10,
              padding: "8px 10px",
              background: D.roseBg,
              borderRadius: 8,
              border: `1px solid ${D.rose}25`,
            }}
          >
            {error}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndUpload(file);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>
    </section>
  );
}
